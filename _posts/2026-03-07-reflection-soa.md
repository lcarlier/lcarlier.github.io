---
layout: post
title: C++26 One element at a time transparent SoA access with the help of reflection
description: Article talking about SoA and reflection
modified: 2026-03-07
tags: [SoA, C++ 26, Reflection]
author: lcarlier
---

<style>
.code-columns {
  display: flex;
  gap: 1rem;
}

.code-columns > div {
  display: inline-block;
  vertical-align: top;
  margin-right: 20px;
}

</style>

# C++26: One element at a time: transparent SoA access with the help of reflection

Modern C++ gives us increasingly powerful tools to write code that is both expressive and performant, but these two goals often feel at odds. When squeezing performance out of data-heavy workloads, developers frequently reach for the Structure of Arrays (SoA) pattern, a memory layout that plays nicely with CPU caches and SIMD vectorization. The catch? Adopting SoA traditionally means sacrificing the natural, intuitive syntax that makes code readable and maintainable.

In this article, we'll explore how C++26's static reflection feature can bridge that gap. By letting the compiler introspect our types at compile time, we can build a lightweight `SoaView` abstraction that gives us the performance of SoA while preserving the ergonomics of indexing into a plain array of structs with zero runtime overhead and no changes to existing call sites.

## Data layout matters

Memory layout is one of the most impactful performance levers available to a C++ developer. When processing large collections of objects and applying a uniform operation across all of them, the way data is laid out in memory can be the performance difference between code that use all of your hardware's capabilities and code that spends most of its time waiting on cache misses.

Consider a particle simulator. Each frame, we update every particle's position based on its velocity:

```cpp
struct Particle {
    float x, y, z;      // position
    float vx, vy, vz;   // velocity
};

static constexpr auto N = 1'000'000;
Particle particles[N];

void onFrame(float dt) {
    for (int i = 0; i < N; i++) {
        particles[i].x += particles[i].vx * dt;
        particles[i].y += particles[i].vy * dt;
        particles[i].z += particles[i].vz * dt;
    }
}
```

This is readable and intuitive but it has a subtle but significant performance problem. Because `x`, `y`, `z`, `vx`, `vy`, and `vz` are all members of the same struct, they are interleaved in memory. Every time the loop advances to the next particle, the CPU must load a new cache line, even though only a fraction of the bytes in that line are actually used during the current iteration. We are paying the cost of loading data we do not need.

## Structure of Arrays

The layout above is known as **Array of Structures** (AoS): a contiguous array of `Particle` objects, each containing all six fields.

```cpp
Particle particles[N];  // AoS
```

The alternative is **Structure of Arrays** (SoA): a single struct whose members are themselves arrays, one per field.

```cpp
static constexpr auto N = 1'000'000;
struct Particles {
    float x[N], y[N], z[N];      // positions
    float vx[N], vy[N], vz[N];   // velocities
};

Particles particles;
```

With SoA, all the `x` values are contiguous in memory, all the `vx` values are contiguous, and so on. When the CPU loads a cache line of `x` values, it gets several consecutive positions at once and exactly the data we need for the next several iterations.

It is worth noting that in this particular example, the total memory footprint is identical in both layouts. But more generally, SoA can also reduce memory waste caused by struct padding in AoS, depending on the field types involved.

The cache efficiency gains are significant, but SoA offers another important benefit: it is far more amenable to auto-vectorization. With contiguous arrays of the same scalar type, the compiler can straightforwardly emit SIMD instructions to process multiple elements per cycle. This is also why SoA is the natural data layout for GPU computation.

For a thorough treatment of SoA and its implications, I highly recommend Vittorio Romeo's keynote at CppCon 2025: [link](https://youtu.be/SzjJfKHygaQ?si=JVZ5q7H1cEyekCgF)

## The ergonomics cost

Migrating to SoA is not free. The `onFrame` function must be rewritten:

```cpp
void onFrame(float dt) {
    for (int i = 0; i < N; i++) {
        particles.x[i] += particles.vx[i] * dt;
        particles.y[i] += particles.vy[i] * dt;
        particles.z[i] += particles.vz[i] * dt;
    }
}
```
Did you notice it?

The index now applies to individual members rather than to the collection as a whole. This is a subtle but consequential shift in how the data is expressed in code. In a large codebase, every call site that accesses particle data may need updating. This refactoring burden that can be substantial.

Beyond the mechanical effort, there is a readability concern. Indexing into a member array (`particles.x[i]`) is less expressive than indexing into the collection itself (`particles[i].x`). The intent is the same, but the SoA form puts the access pattern front and centre in a way that can obscure the higher-level logic. It is also more error-prone: it becomes easier to accidentally mix indices across members.

Ideally, we would want the performance of SoA with the ergonomics of AoS. As of C++26, we can have exactly that.

## Transparent SoA access with C++26 reflection

C++26 introduces static reflection, which allows the compiler to introspect types at compile time and use that information to generate new types and code. This is precisely the tool we need.

The idea is to define a `SoaView` type that, given a SoA struct and an index `i`, presents a view object whose members are lvalue references into the corresponding arrays at position `i`. Accessing `view.x` gives a reference to `particles.x[i]`, and so on. Cherry on top of the cake, with zero runtime overhead.

Here is the implementation:

```cpp
template <typename T>
struct SoaViewImpl {
    struct impl;

    consteval {
        std::vector<std::meta::info> new_members = {};

        template for (constexpr std::meta::info member : std::define_static_array(
                          nonstatic_data_members_of(^^T, std::meta::access_context::current()))) {
            using array_elem_type = std::remove_extent_t<typename[:type_of(member):]>;
            new_members.push_back(data_member_spec(^^std::add_lvalue_reference_t<array_elem_type>,
                                                   {.name = identifier_of(member)})
                                );
        }

        define_aggregate(^^impl, new_members);
    }

    static constexpr std::size_t member_count =
        nonstatic_data_members_of(^^T, std::meta::access_context::current()).size();

    static auto make(T& src, std::size_t i) {
        return [&]<std::size_t... Is>(std::index_sequence<Is...>) {
            constexpr auto members = std::define_static_array(
                nonstatic_data_members_of(^^T, std::meta::access_context::current()));
            return typename SoaViewImpl<T>::impl{src.[:members[Is]:][i]...};
        }(std::make_index_sequence<member_count>{});
    }
};

template <typename T>
using SoaView = SoaViewImpl<T>::impl;
```

Let's walk through this step by step.

`SoaViewImpl<T>` is parameterised on the SoA struct type `T`. It forward-declares an inner `struct impl`, whose definition is generated at compile time by the `consteval` block.

The `consteval` block iterates over every non-static data member of `T` using `template for` which is a C++26 compile-time loop over reflection ranges. For each member, it retrieves the array element type with `std::remove_extent_t`, then appends a data member specification to `new_members` using the same member name. Once all members have been processed, `define_aggregate` synthesizes the `struct impl` from those specifications.

The result is a struct that mirrors `T` in its member names, but replaces each array member with a reference to the corresponding element type.

`SoaViewImpl<T>::make(src, i)` constructs an instance of `SoaViewImpl<T>::impl` by binding each reference member to `src.<member>[i]`. This relies on two indices operating at different compile-time and runtime levels:

1. `Is`: a compile-time pack index used to select the correct reflected member of `T`.
2. `i`: the runtime index that selects the position within each array.

Finally, the `SoaView<T>` alias exposes `impl` directly, giving call sites a clean interface.

## Putting it all together

With `SoaViewImpl` in place, we can retrofit `Particles` with a subscript operator:

```cpp
static constexpr auto N = 1'000'000;
struct Particles {
    float x[N], y[N], z[N];      // positions
    float vx[N], vy[N], vz[N];   // velocities

    using View = SoaViewImpl<struct Particles>;
    auto operator[](std::size_t i) { return View::make(*this, i); }
};

Particles particles;

void onFrame(float dt) {
    for (int i = 0; i < N; i++) {
        particles[i].x += particles[i].vx * dt;
        particles[i].y += particles[i].vy * dt;
        particles[i].z += particles[i].vz * dt;
    }
}
```

`operator[]` returns a `View::impl` whose reference members alias the correct positions in each array. From the caller's perspective, `particles[i].x` reads exactly like AoS access. Under the hood, the data layout is pure SoA. The original call-site code requires no changes whatsoever.

This is the kind of zero-cost abstraction that C++ has always promised: the right data layout, with the right interface, at no runtime cost.

## Performance

Rather than benchmark figures, let's go straight to the generated assembly. You can inspect it yourself on [Compiler Explorer](https://godbolt.org/z/bTvMfoMnh).

<div class="code-columns" markdown="1">

<div markdown="1">

`Array of structures`

```x86asm
onFrame(float):
        movaps  xmm1, xmm0
        shufps  xmm1, xmm0, 0
        xor     eax, eax
        lea     rcx, [rip + particles]
.LBB0_1:
        movsd   xmm2, qword ptr [rax + rcx]
        movsd   xmm3, qword ptr [rax + rcx + 12]
        movsd   xmm4, qword ptr [rax + rcx + 24]
        movsd   xmm5, qword ptr [rax + rcx + 36]
        mulps   xmm3, xmm1
        addps   xmm3, xmm2
        movlps  qword ptr [rax + rcx], xmm3
        movss   xmm2, dword ptr [rax + rcx + 20]
        mulss   xmm2, xmm0
        addss   xmm2, dword ptr [rax + rcx + 8]
        movss   dword ptr [rax + rcx + 8], xmm2
        mulps   xmm5, xmm1
        addps   xmm5, xmm4
        movlps  qword ptr [rax + rcx + 24], xmm5
        movss   xmm2, dword ptr [rax + rcx + 44]
        mulss   xmm2, xmm0
        addss   xmm2, dword ptr [rax + rcx + 32]
        movss   dword ptr [rax + rcx + 32], xmm2
        add     rax, 48
        cmp     rax, 24000000
        jne     .LBB0_1
        ret

particles:
        .zero   24000000
```

</div>

<div markdown="1">

`Structure of arrays`

```x86asm
onFrame(float):
        shufps  xmm0, xmm0, 0
        xor     eax, eax
        lea     rcx, [rip + particles]
.LBB0_1:
        movups  xmm1, xmmword ptr [rcx + 4*rax + 12000000]
        movups  xmm2, xmmword ptr [rcx + 4*rax]
        mulps   xmm1, xmm0
        addps   xmm1, xmm2
        movups  xmmword ptr [rcx + 4*rax], xmm1
        movups  xmm1, xmmword ptr [rcx + 4*rax + 16000000]
        movups  xmm2, xmmword ptr [rcx + 4*rax + 4000000]
        mulps   xmm1, xmm0
        addps   xmm1, xmm2
        movups  xmmword ptr [rcx + 4*rax + 4000000], xmm1
        movups  xmm1, xmmword ptr [rcx + 4*rax + 20000000]
        movups  xmm2, xmmword ptr [rcx + 4*rax + 8000000]
        mulps   xmm1, xmm0
        addps   xmm1, xmm2
        movups  xmmword ptr [rcx + 4*rax + 8000000], xmm1
        add     rax, 4
        cmp     rax, 1000000
        jne     .LBB0_1
        ret

particles:
        .zero   24000000
```

</div>
</div>

Three things stand out immediately:

* **Instruction count.** The SoA loop body is noticeably shorter. The AoS version is handling partial SIMD loads (`movsd`, `movlps`) alongside scalar operations (`mulss`, `addss`), a sign that the compiler could not fully vectorize the interleaved layout.
* **Vectorization quality.** The SoA version uses `movups` throughout unaligned 128-bit loads processing four floats at a time with every instruction. The AoS version mixes 64-bit and 32-bit loads, revealing that the compiler was forced to handle the `z` component separately due to the interleaved struct layout.
* **Iteration count.** The AoS loop advances by 48 bytes per iteration (the size of one `Particle`) and runs for `24,000,000 / 48 = 500,000` iterations. The SoA loop advances by 4 elements per iteration (one SIMD register width) and runs for `1,000,000 / 4 = 250,000` iterations, half as many, processing twice as many elements per loop.

The assembly makes the argument plainly: SoA enables the compiler to generate tighter, more vectorized code. The `SoaView` abstraction adds nothing to this output. It is fully transparent at compile time, exactly as intended.

## Prior art: manual views before C++26
The `SoaView` concept is not unique to C++26. Before static reflection, the same ergonomic goal was achievable by manually writing a companion view struct: a mirror of the SoA struct whose members are lvalue references rather than arrays, constructed explicitly in `operator[]`.

The approach works, and the generated code is equally efficient. The problem is maintainability: the view struct is a hand-written duplicate of the SoA struct. Every field addition, rename, or removal must be applied in two places, in lockstep, with no compiler enforcement to catch divergence. It is precisely the kind of brittle boilerplate that C++26 reflection eliminates. `SoaViewImpl<T>` derives everything it needs directly from T, so the view is always guaranteed to be in sync with its source type.

## Sandbox
While experimenting with reflection, I also used the following [compiler explorer](https://godbolt.org/z/abec8367f) sandbox which shows that a value of an array can transparently be modified with the view.