---
layout: post
title: Static vs. inline variables
description: What `static` and `inline` mean for variables in C++, especially when they appear in header files.
modified: 2026-11-21
tags: [C++, basics]
author: lcarlier
---

# Introduction
Last Friday, while reviewing some code, I had a long conversation with a colleague about when to use the `static` and `inline` keywords and how they affect a program. It was Friday afternoon, the sort of time when a discussion can be more useful than diving into a difficult task. After answering a few questions, I realized that these familiar keywords can still be confusing. This article explains what they mean for variables and how their behavior changes when they appear in a header.

# Variables vs. functions
Both `static` and `inline` can be used with variables and functions, but their effects depend on the context. To keep the discussion focused, this article covers namespace-scope variables only; it does not cover functions or `static` data members of classes and structs.

# Translation unit
First, let's define a translation unit (TU). Wikipedia gives a useful description:

> In C and C++ programming language terminology, a translation unit (or more casually a compilation unit) is the ultimate input to a C or C++ compiler from which an object file is generated. A translation unit roughly consists of a source file after it has been processed by the C preprocessor, meaning that header files listed in `#include` directives are literally included, sections of code within `#ifndef` may be included, and macros have been expanded. A C++ module also comprises a single translation unit, though while in a module `#include` directives will be expanded, import statements do not undergo expansion and thus are not.
>
> Source: [Wikipedia, *Translation unit (programming)*](https://en.wikipedia.org/wiki/Translation_unit_(programming))

One of the key phrase of the definition is “after it has been processed by the C preprocessor.” In other words, the contents of headers included by a `.cpp` file become part of that source file's TU.

The compiler processes each TU and typically produces an object file, often with the `.o` extension.

In informal conversation, people sometimes use “TU” to mean the object file produced from it, for example, “link the TUs together.” Strictly speaking, a TU is the preprocessed source code, while the object file is the compiler's output. I will keep those terms distinct here.

# One definition rule (ODR)
The One Definition Rule (ODR) governs how many definitions an entity may have in a program. As a starting point, most entities must have only one definition in the program. In a single TU, an entity must not be defined more than once.

This distinction will be important when comparing `static` and `inline`.

# Linkage
Before looking at the keywords themselves, it helps to understand linkage: the property that determines whether declarations of a name in different parts of a program can refer to the same entity.

A name in C++ can have one of the following kinds of linkage:
* `external linkage`
* `internal linkage`
* `no linkage`

Here, the name might be the name of a variable. In compiled code, people also sometimes refer to the corresponding linker symbol.

Module linkage was added in C++20, but it is not addressed in this article.

A variable has external or internal linkage here only when it is declared at global scope or namespace scope. Variables in other contexts, such as local variables and non-static class members, have no linkage.

## External linkage
With external linkage, declarations in different TUs can refer to the same entity. If that entity is a variable, the program has one variable that those TUs can access. This does not mean every TU can use it without a declaration; each TU that needs the variable must see a suitable declaration.

At namespace scope, a non-`const` variable has external linkage by default. Consider this source file:

```cpp
int foo = 42;
```
{: data-filename="a.cpp" }
`a.cpp` defines `foo` with external linkage. Another TU can declare the same variable with `extern`:

```cpp
extern int foo;
int setFoo(int val) { foo = val; }
```
{: data-filename="b.cpp" }
Calling `setFoo` modifies that same variable, so the change is visible in `a.cpp`.

## Internal linkage
With internal linkage, a name refers to an entity that is local to one TU. Two TUs can therefore each define a different entity with the same name. By contrast, defining the same external variable in multiple TUs violates the ODR. A linker may diagnose this, but the language does not require a diagnostic for every ODR violation.

# The `static` keyword
At global scope, `static` gives a variable internal linkage. Consider the same declaration in two separate source files:

```cpp
static int foo = 42;
```
{: data-filename="a.cpp" }

```cpp
static int foo = 42;
```
{: data-filename="b.cpp" }

These declarations define two distinct variables with the same name and initializer. Each TU can refer only to its own `foo`, so changing one does not change the other.

We can see that the variables are distinct by printing their addresses. To keep the example focused, there are no headers: `main.cpp` declares the two functions it calls, and each source file defines one.

```cpp
static int foo = 42;
namespace A {
int* get_foo() { return &foo; }
}
```
{: data-filename="a.cpp" }

```cpp
static int foo = 42;
namespace B {
int* get_foo() { return &foo; }
}
```
{: data-filename="b.cpp" }

```cpp
#include <cstdio>

namespace A { int* get_foo(); }
namespace B { int* get_foo(); }

int main() {
    std::printf("a: %p\n", static_cast<void*>(A::get_foo()));
    std::printf("b: %p\n", static_cast<void*>(B::get_foo()));
}
```
{: data-filename="main.cpp"}
Compile the three source files together and run the program; it prints two different addresses. See the example on [Compiler Explorer](https://godbolt.org/z/EjfToT1G6).

# The effect of `#include`
Now let's declare `foo` using the `static` keyword in a header and have both `a.cpp` and `b.cpp` include it. `main.cpp` remains unchanged.

```cpp
#ifndef HEADER_H
#define HEADER_H

static int foo = 42;

#endif
```
{: data-filename="header.h" }

```cpp
#include "header.h"

namespace A {
int* get_foo() { return &foo; }
}
```
{: data-filename="a.cpp" }

```cpp
#include "header.h"

namespace B {
int* get_foo() { return &foo; }
}
```
{: data-filename="b.cpp" }

```cpp
#include <cstdio>

namespace A { int* get_foo(); }
namespace B { int* get_foo(); }

int main() {
    std::printf("a: %p\n", static_cast<void*>(A::get_foo()));
    std::printf("b: %p\n", static_cast<void*>(B::get_foo()));
}
```

Will the program print the same address twice, or two different addresses? After all, both source files include the same header.

Because the header's contents are included separately in each TU, the result is like the previous example: each TU gets its own internal-linkage `foo`, so the addresses differ. See [Compiler Explorer](https://godbolt.org/z/nY1EsK1nE).

This is the first important lesson: a `static` variable defined in a header denotes a distinct variable in every TU that includes the header. If those variables are used, they may require separate storage, which can increase a program's memory use.

This is not necessarily wrong; it depends on whether separate per-TU variables are what you intend. But before defining a `static` variable in a header, consider the consequences.

# The `inline` keyword
Now let's change `static` to `inline` in the previous example. The rest of the source remains unchanged.

```cpp
#ifndef HEADER_H
#define HEADER_H

inline int foo = 42;

#endif
```
{: data-filename="header.h" }

```cpp
#include "header.h"

namespace A {
int* get_foo() { return &foo; }
}
```
{: data-filename="a.cpp" }

```cpp
#include "header.h"

namespace B {
int* get_foo() { return &foo; }
}
```
{: data-filename="b.cpp" }

```cpp
#include <cstdio>

namespace A { int* get_foo(); }
namespace B { int* get_foo(); }

int main() {
    std::printf("a: %p\n", static_cast<void*>(A::get_foo()));
    std::printf("b: %p\n", static_cast<void*>(B::get_foo()));
}
```

The behavior changes: both functions return the same address (see [Compiler Explorer](https://godbolt.org/z/1Mvba6nn4)). An inline variable with external linkage may be defined in multiple TUs. Those definitions must satisfy the ODR. In this example, **they must be identical** and refer to the same entity.

{% include important.html content="Inline variables were introduced in C++17. Before C++17, <code>inline</code> could be used for functions, but not to define a variable in a header in this way. A common approach was to declare the variable with <code>extern</code> in a header and provide its single definition in a source file." %}

Using `inline` here lets us define one shared variable in a header while including that header in multiple TUs. This is useful for variables that need a definition in a header, such as shared constants. With `static`, each TU instead gets its own copy of the variable; with `inline`, the declarations refer to one entity.

The ODR requirements are strict. If definitions of an `inline` variable in different TUs do not meet them, the program has undefined behavior, and a compiler is not required to issue a diagnostic. For example:

```cpp
inline int foo = 42;
namespace A {
int* get_foo() { return &foo; }
}
```
{: data-filename="a.cpp" }

```cpp
inline int foo = 43;   // different initializer
namespace B {
int* get_foo() { return &foo; }
}
```
{: data-filename="b.cpp" }

It may appear that the linker simply chooses one definition, but that is not a behavior the C++ standard guarantees. Because the program violates the ODR, its behavior is undefined: do not rely on either value being selected, regardless of whether the program compiles and links. We cannot know if `foo` will be initialized with `42` or `43`.

# A final word about `const`
At global scope, `const` variables have internal linkage by default in C++, unlike in C. When declared in a header, they may therefore create a separate object in each translation unit. Prefixing the variable with `inline` allows the header to provide one shared entity across translation units.

# Takeaway
At global scope or namespace scope, `static` gives a variable internal linkage, so a definition in a header creates a separate variable in each TU that includes it. Since C++17, `inline` allows the same variable to be defined in multiple TUs while still denoting one shared entity, provided every definition satisfies the ODR. Choose `static` when you intentionally want per-TU state; choose `inline` when you want one shared variable defined in a header. If you do not need a variable definition in the header, a conventional `extern` declaration and one definition in a source file may be clearer.
