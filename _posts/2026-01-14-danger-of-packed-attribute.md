---
layout: post
title: The dangers of using __attribute__((packed))
description: Running a Qt application in your web browser
modified: 2025-12-20
tags: [Qt, emscripten]
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

# The dangers of using \_\_attribute\_\_((packed))

This article is explaining why using `__attribute__((packed))` is generally a bad idea in C++.

I would recommend that you never use `__attribute__((packed))` or use it only for good reason
i.e. think twice before writing those characters, speak with your colleagues...

First the undefined behavior aspect will be addressed. Then the article will speak about the
performance impact that packed structure can have.

## 1. Undefined behavior

First of all, in order to address the elephant in the room, let me first say this.

{% include important.html content="If the pointer points to an address not correctly aligned to the referenced type, the behavior is undefined." %}

See also the [C++ standard](https://eel.is/c++draft/basic.align)

This means that when using an unaligned pointer, your program will sometimes crash (good..., I
guess....), sometimes run with wrong behavior (very bad) and sometimes yield the correct
behavior (the worst that can happen...).

Here is an example on how we can end up having an unaligned pointer. Consider the following
struct

```cpp
struct S {
    uint64_t a;
    uint8_t b;
    uint16_t c;
} __attribute__((packed));
```

Because it is packed, its memory alignment is 1. Which means that the compiler will align any
instance of this struct on any address. You can convince yourself by executing the following
static\_assert. The compiler will not return an error message.

```cpp
static_assert(alignof(S) == 1);
```
Note: there is also the type\_trait `std::alignment_of` which serves the same purpose.

This is very important because if we execute the following program, you will see that it is very
easy to get unaligned pointers.

```cpp
int main() {
    // 2 variables declared on the stack
    {
        S s0; // Maybe aligned
        S s1; // Definitely not aligned
        printf("2 variables on stack: %p %p\n", &s0.a, &s1.a);
    }
    // Use S in an array
    {
        S s[10];
        // &s[0].a might be aligned
        // &s[1].a will definitely not be aligned
        printf("S used in an array: %p %p\n", &s[0].a, &s[1].a);
    }
}
```

Here is one possible output

```
2 variables on stack: 0x7ffd24d87575 0x7ffd24d8756a
S used in an array: 0x7ffd24d874f0 0x7ffd24d874fb
```

We see that in the case where we declare S on the stack, `&s0.a` and `&s1.a` are not aligned.

In the case of an array, the compiler aligned the first element but then the second element will
not be aligned (you asked for it with `__attribute__((packed))`...)

Now consider the following function

```cpp
static S s[10];

uint64_t wrong() {
    void* va = reinterpret_cast<void*>(&s[1].a);
    uint64_t* a = reinterpret_cast<uint64_t*>(va);
    *a = 42; // undefined behaviour
    return *a;
}
```

In this situation, I'm first casting the address to `void*` and then back to `uint64_t*`. By doing that,
the compiler will not issue any warning (if you would cast directly to `uint64_t*` it would warn `-Waddress-of-packed-member` ).

Casting to `void*` and back to `uint64_t*` is not far-fetched and I'm pretty sure we can find many of
these examples in our code (not in the same function of course).

Coming back to the problem, the address pointed to by `a` will be unaligned and when modifying
it (or reading it) we will have the undefined behavior.

If one really wants to use an `uint64_t*` pointer (because some other function needs it for
instance), the only solution is to use a `std::memcpy`. Actually, I would argue that if you need to
cast any `void*` to something else, `std::memcpy` is the solution. In some cases, the compiler will
know that the pointer is aligned and will just optimize the memcpy away.

```cpp
void use(uint64_t*);

uint64_t safe() {
    uint64_t local;
    std::memcpy(&local, &s[1].a, sizeof(uint64_t));
    use(&local);
    return local;
}
```

As a last remark, I want to add that the padding bytes (especially the one at the end of the
struct) are automatically added by the compiler for the very reason that the structs are
optimized to be used in arrays. Because of the padding bytes, each element of the array will be
nicely aligned, and there cannot be any undefined behavior. Something important to remember
is when a structure is not packed, the memory alignment requirement of the struct (i.e.
what `alignof` will yield) is equal to the highest memory alignment requirement of any of its fields
(not only the first one...).

## 2. Performance impact

We have established that packed structure is very likely not going to be aligned. This means
that when accessing the field of the structure, the compiler needs to take into account
the alignment. Some hardware allows unaligned accesses, so the compiler will probably not
mind. But other platforms like the Cortex-R4 will not allow unaligned access.
Consider the 2 following functions:

```cpp
static S s[10];

uint64_t accessIndexZero() {
    s[0].a = 42;
    return s[0].a;
}

uint64_t accessIndexOne() {
    s[1].a = 42;
    return s[1].a;
}
```

Now let's compare their assembly (compiled with ARM):

<div class="code-columns" markdown="1">

<div markdown="1">

```armasm
accessIndexZero():

        movw    r3, #:lower16:.LANCHOR0
        movt    r3, #:upper16:.LANCHOR0
        push    {r4}
        movs    r2, #0
        movs    r4, #42
        movs    r0, #42
        movs    r1, #0
        strd    r4, r2, [r3]
        ldr     r4, [sp], #4
        bx      lr
```

</div>

<div markdown="1">


```armasm
accessIndexOne():

        movw    r1, #:lower16:.LANCHOR0
        movt    r1, #:upper16:.LANCHOR0
        add     r3, r1, #11
        movs    r2, #0
        movs    r0, #42
        strb    r0, [r1, #11]
        movs    r0, #42
        movs    r1, #0
        strb    r2, [r3, #1]
        strb    r2, [r3, #2]
        strb    r2, [r3, #3]
        strb    r2, [r3, #4]
        strb    r2, [r3, #5]
        strb    r2, [r3, #6]
        strb    r2, [r3, #7]
        bx      lr
```

</div>
</div>

In `accessIndexZero()`, we see that the compiler understands that the element 0 of the array is
aligned (even though packed) and does efficient 64 bits memory access. 

However in `accessIndexOne()`, we see that the compiler understands that the element is not aligned
(because of the packing) and is going to do byte accesses (`strb`) which will be significantly
slower.

Note that in this case, both functions do not have undefined behavior. But because of the
packing, one is significantly slower than the other.

## 3. Conclusion

Using `__attribute__((packed))` is generally not needed. It should only be used in limited use
cases e.g. when you want to match some hardware layout or for inter-process communication.
In general, packing the structure is a very bad idea and will do more harm than the few bytes
you are going to save in memory.

Here is a link to the compiler explorer environment that I used for making this
article: [Compiler Explorer](https://godbolt.org/z/nWrxnMrbe)
