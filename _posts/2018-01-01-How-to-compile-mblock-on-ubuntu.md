---
layout: post
title: How to compile mBlock on Ubuntu
description: Procedure on how to compile mBlock on Ubuntu
modified: 2018-01-01
tags: [mBlock mBot]
author: lcarlier
---
# mBlock
mBlock is an IDE to program Arduino via the scratch language. The same project is used to program mBot robot. Unfortunately, mBlock is not released in its latest version for Linux so I had to recompile it from scratch. This post is about the procedure I had to do in order to get everything right.

# Install nodejs
First thing is to install nodeJS. There is already a trick to know
```bash
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Reference is from <https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions>

# Install npm
From Ubuntu packages
```bash
sudo apt install npm
```

# Install necessary development libraries
```bash
sudo apt install libbluetooth-dev
sudo apt install libusb-1.0-0-dev
```

# Follow installation from mBlock github
Reference: <https://github.com/Makeblock-official/mBlock>

First clone mBlock

```bash
git clone https://github.com/Makeblock-official/mBlock.git
```

Then compile everything with npm
```bash
npm install
npm run rebuild-serialport
npm run rebuild-hid
npm run rebuild-bluetooth
```

# Install extra dependencies
```bash
npm install --save-dev electron-prebuilt
```

# Start mBlock
```bash
npm start
```
