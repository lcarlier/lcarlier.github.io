---
layout: post
title: Running Immich on Raspberry Pi with NAS Storage
description: Running Immich on Raspberry Pi with NAS storage
modified: 2025-12-17
tags: [Raspberry Pi, Docker, Immich]
author: lcarlier
---

Part of my home server setup is to have a backup of the photos on my iPhone directly on my NAS. I don't want to rely on iCloud and I'd rather know exactly where my data is stored.

A brilliant solution for creating a self-hosted alternative is called [Immich](https://immich.app/). It's a platform where you can run your own server. Simply download the `docker-compose.yml` file along with the `.env` file and execute `docker compose up -d`. Then, from the Immich app that you can install on your iPhone, a backup is created automatically.

Since I've only got a Raspberry Pi 4 to hand, this is my only option for running the server.

It sounds straightforward on paper, but it actually comes with its fair share of problems.

Mounting the NAS on the Raspberry Pi 4 is quite easy. However, when I tried the `docker compose up -d` command, I encountered some issues where certain directories couldn't be `chown`ed.

It turns out that Immich can't be run from an NFS-mounted filesystem. You need a hybrid approach: the server must run on an ext4 filesystem whilst the uploads can live on the NAS server.

Since I didn't want to wear out my SD card by running the Immich database on it, I decided to plug in a USB stick to my Raspberry Pi 4. From there, I'm able to run the Immich database and application.

In order to have my uploads go directly to the NAS, I added the following to the `volumes` section of the Immich server configuration like so:
```yml
volumes:
      # Do not edit the next line. If you want to change the media storage location on your system, edit the value of UPLOAD_LOCATION in the .env file
      - ${UPLOAD_LOCATION}:/data
      - /mnt/NAS/immich-data:/mnt/NAS/immich-data:rw
      - /etc/localtime:/etc/localtime:ro
```

Then I updated the `UPLOAD_LOCATION` variable inside the `.env` file to match the new location:
```
UPLOAD_LOCATION=/mnt/NAS/immich-data
```

Now everything runs without a hitch and my photos and videos are uploaded directly to the NAS.
