---
layout: post
title: How to define a C++ class template outside the class definition
description: We are going through different ways of defining a template outside of the class definition
modified: 2026-03-07
tags: [C++, templates]
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

# Introduction

I recently gave a talk at CppCon about templates, and while preparing my presentation and presenting the slides to my friends and colleagues, I noticed that even experienced engineers were surprised at how the templated member functions of a templated class are defined outside of the templated class definition.


# A little bit of syntax
Before we start, it is useful to review the syntax for defining a template.
```
template < [parameter-list] >
definition
```

A definition can be a function, in which case the syntax becomes
```
template < [parameter-list] >
[return-type] [function-name]([function-parameters]) {
    // Function definition
}
```
It can also be a class/struct, in which case the syntax becomes
```
template < [parameter-list] >
class [class-name] {
    // class definition
};
```

We can also define type aliases, variables, or concepts, but for today we will only need functions and classes.

# Defining the functions as part of the class definition

The typical way to define the functions of the templated class is by giving the definition of each function as part of the class definition. Let's have a look at a simple example.

**Stack.hpp**
```cpp
template<typename T>
	class Stack {
	private:
		std::vector<T> data;
	public:
		void pop() { data.pop_back(); }
		const T& top() const { return data.back(); }
		bool empty() const { return data.empty(); }
		std::size_t size() const { return data.size(); }
	 
		template <typename ...U>
		void emplace(U&&... args) { data.emplace_back(std::forward<U>(args)...); }
};
```
The above example shows a straightforward stack implementation. All the class methods (`pop`, `top`, ...) are defined inside the class definition.

It is possible to have a templated member function inside a templated class. This is the case for the `emplace` function. We know that the function is templated because we find the construct `template <typename ...U>` above the function definition.

A very important concept to know about a templated class is that `Stack<int>` and `Stack<float>` are two different types within C++'s type system.

# Defining the templated member function outside of the templated class
What we have seen so far works. However, it is also possible to give the definition of the member function outside of the templated class definition.

Before digging into the templated class, let's first review how we can give the definition of a member function of a non-templated class.

```cpp
class MyClass {
public:
    // Function declaration without its definition
    int getValue();
};

// Definition of the getValue function of MyClass
int MyClass::getValue() {
    return 42;
}
```
Notice the syntax used to define a class member function; it is different from that of a regular free function.
```
[return-type] [type]::[function-name]([function-parameters]) {
    // function definition
}
```
Before being able to declare our `[function-name]`, we need to give the `[type]` that the function belongs to. Notice that I use the word `type` and not `class`.

Now let's have a look at how it works for non-templated functions of a templated class, for instance `pop`.

```cpp
template<typename T>
void Stack<T>::pop() { data.pop_back(); }
```
There are 2 things to note here:
1. Even though the class template isn't used anywhere in the function definition, we still need to specify `template<typename T>` before the member function definition.
2. If we look at the syntax for defining a member function of a templated class, we see that `Stack<T>` is given as the `[type]`. This is because, for a templated class, the actual type is only defined once we create an instance of our stack, e.g. `Stack<int>`.

We now understand why `template<typename T>` needs to be written before the function definition: we need to tell the compiler that `T` is a template parameter and that `pop()` is part of `Stack<T>`, which is a templated class.

Now back to the definition of the templated member function of the templated class. Here is how it works:
```cpp
template<typename T>
template<typename ...U>
void Stack<T>::emplace(U&&... args) { 
    data.emplace_back(std::forward<U>(args)...);
}
```
The thing that surprises everyone is that we need to use the `template<typename>` construct twice before giving the function definition. But why?

The reason is that we need to declare the template parameter of the class, i.e. `T`, separately from the template parameter of the function, `...U`. So we use `template<typename T>` to declare the template parameter of the `Stack` templated class, and then we use `template<typename ...U>` to declare the template parameter of the templated function `emplace`.

It is not possible to declare both template parameters inside a single `template<>` statement, i.e.
```cpp
template<typename T, typename ...U>
void Stack<T>::emplace(U&&... args) {/*...*/}
```
This is because it introduces an inconsistency.
On one hand, we're telling the compiler that the function has 2 template arguments - `T` and the parameter pack `U`. On the other hand, `T` is a parameter of the `Stack` templated class.

I hope you learned something, and that you won't be confused by this in the future.