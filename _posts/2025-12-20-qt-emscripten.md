---
layout: post
title: Qt app in your browser
description: Running a Qt application in your web browser
modified: 2025-12-20
tags: [Qt, emscripten]
author: lcarlier
---

[Emscripten](https://emscripten.org/) is a tool that allows you to compile a C++ program so that it can run directly inside your web browser.

I created a small [example](https://www.laurentcarlier.com/test-qt-widget-emscripten.github.io/) demonstrating this, which is hosted on [GitHub](https://github.com/lcarlier/test-qt-widget-emscripten.github.io/).

One limitation I encountered was that the message box I wanted to display would cause the application to crash when using the following API:

```cpp
QMessageBox::information(...);
```

To make it work correctly, I had to use the `open()` function and construct the message box manually over several lines. Unlike the static convenience functions, `open()` does not block the caller, allowing Emscripten to continue execution without issues.

```cpp
QMessageBox *msgBox = new QMessageBox(this);
msgBox->setWindowTitle(...);
msgBox->setText(...);
msgBox->setIcon(QMessageBox::Information);
msgBox->setAttribute(Qt::WA_DeleteOnClose);
msgBox->open();  // Non-blocking
```

