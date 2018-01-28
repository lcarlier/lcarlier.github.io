---
layout: post
title: Bank record Analyzer
description: A small app to quickly analyze your bank records
modified: 2018-01-28
tags: [python]
author: lcarlier
---
# Bank Record Analyzer
Last weekend I was trying to check expenses I've done on my online bank system. I was just frustrated how it was not possible to make a simple search over the several accounts that I have at that bank. On top of that, the only way I could export my bank records was in PDF. No supports for csv. This is definitely not easy to search for particular transaction.

I decided to Google a bit how I could read those PDF files by myself and I discovered the python library [pdfminer](https://github.com/euske/pdfminer). After a few tests, I could see that this was the tool that I needed and I decided to develop my own application for quickly filtering my bank records. It was around 10PM that day...

6 hours later (so 4AM), I came with a first version which is now available on my [github](https://github.com/lcarlier/BankRecordsAnalyzer). It is implemented in Python and using QT for the GUI.

The interface is bare minimum but already gave some challenges, e.g. placing the research field inside the TableView header.
![qheaderview_filter](../../../assets/img/QHeaderView_header.jpg  "QTableView with filter")