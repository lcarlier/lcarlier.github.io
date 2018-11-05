---
layout: post
title: My first A to Z electronic project
description: In this post, I'm showing how I build my first A to Z home made electronic project
modified: 2018-11-04
tags: [3d printer, PCB, electronic]
author: lcarlier
---

Recently, while trying to find my favorite shirt in my closet, I came into the issue that I couldn't see a thing in it. Since I'm an electronic enthusiast, I thought: "Why not building my own lighting system for my closet?".

That was it, I had the idea of making a small PCB which would feature the following:

- Possibility to plug several LED strips in parallel.
- A motion sensor that would trigger the LED strips, since my closet does not have any door.
- No µController, low power consumption.
- USB power connection as well as regular DC adapter connection for being able to plug a battery pack.

In order to light up the LED strip, I knew that I needed to provide a 5V signal to the LED input so that it would light up. The first thing that I needed is a trigger for a transistor that would allow my LED strip to work. After a quick search on ALIExpress, I came up with a "Mini PIR motion sensor"

![Mini PIR motion sensor](/assets/img/AZProject/trigger.jpg "Mini PIR motion sensor"){:height="100px"}

After buying it and making some tests on a breadboard, I could see that this sensor worked good but only asserted a signal for a couple of a seconds. I start to wonder how could I keep the signal asserted for a given amount of time. After some research on Google, I discovered a component which is called the timer 555. This is a very cool component as it features several use cases e.g:

- one shot trigger timer
- re-triggerable timer
- sine/square wave generation at a given frequency
- ...

By reading a little bit of literature on Internet about the timer 555, I came up with a circuit that allows me to get my 5V signal for the amount of time I wanted.

I first tested my circuit with the help of [circuimod](https://sourceforge.net/projects/circuitmod/) which is a very handy software to test home made circuit and see how current, voltage and signals behave.

![circuitmod schematic](/assets/img/AZProject/circuitModSchematics.jpg "cicuitmod Schematic"){:height="300px"}
![circuitmod wave](/assets/img/AZProject/circuitModWaves.jpg "circuitmod Wave"){:height="300px"}

Then, after a final check on a breadboard, I modeled a PCB using the [EasyEDA](https://easyeda.com) platform on which I also ordered some PCB prints from their own services via [JLCPCB](https://jlcpcb.com/). My final schematic and PCB design are available on the [project page](https://easyeda.com/lcarlier/Motion-sensor-Switch).

![PCB nude top](/assets/img/AZProject/IMG_1020.JPG "PCB nude top"){:height="300px"}
![PCB nude bottom](/assets/img/AZProject/IMG_1021.JPG "PCB nude bottom"){:height="300px"}
![PCB soldered top](/assets/img/AZProject/IMG_E1022.JPG "PCB soldered top"){:height="300px"}

My project was now functional. But to make it complete, it needed an enclosure. Since a recently build my own [3D printer]({% post_url 2018-08-26-3d-printer %}), I was able to model my own enclosure using [FreeCAD](https://www.freecadweb.org/). The model file is available under this [link](/assets/threeDModel/AZProject/box.fcstd).

![FreeCAD model bottom](/assets/img/AZProject/freecadBottom.jpg "FreeCAD model bottom"){:height="300px"}
![FreeCAD model top](/assets/img/AZProject/freecadTop.jpg "FreeCAD model top"){:height="300px"}

![Print box empty](/assets/img/AZProject/IMG_1024.JPG "Print box empty"){:height="300px"}
![Print box PCB inside](/assets/img/AZProject/IMG_1025.JPG "Print box PCB inside"){:height="300px"}
![Print box PCB inside conenctor](/assets/img/AZProject/IMG_1027.JPG "Print box PCB inside connector"){:height="300px"}
![Print box light](/assets/img/AZProject/IMG_1026.JPG "Print box light"){:height="300px"}

Done! This project was very interesting for me as I learned a lot during the process. I have to say I'm quite happy to have discovered the timer 555 and its amazing functionalities. If you like to know a bit more about this component, I recommend you watching the [video](https://www.youtube.com/watch?v=fLaexx-NMj8) of Great Scott over that subject on Youtube.
