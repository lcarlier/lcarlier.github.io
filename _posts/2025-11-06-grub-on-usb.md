---
layout: post
title: Install GRUB on a USB key
description: This post explain how I managed to install GRUB
modified: 2025-11-06
tags: [Linux, GRUB]
author: lcarlier
---

# Booting a Manjaro Installation After NVMe Drive Failure

My personal computer is equipped with two 1 TB NVMe PCIe SSDs.  
- **Drive 1** contains the boot partition and a **Windows 11** installation, primarily used for gaming.  
- **Drive 2** hosts my **Manjaro** Linux installation.

Unfortunately, disaster struck after a routine Windows 11 update, the first NVMe drive suddenly failed. Although the BIOS still detects it, the reported capacity is **0 GB**, and attempting a self-test causes the BIOS to hang.

As a result, the system became unbootable. However, since my second SSD (with Manjaro) remained intact, I decided to **install GRUB on a USB key** to boot into my Manjaro installation while troubleshooting the faulty SSD.

The process was not overly complex, but it took some time to gather the correct information since most online resources didn’t fully match my situation. Also, the GPTs weren't big help.
Below is the step-by-step guide I followed to install GRUB on a USB key.

---

# Requirements
You’ll need:
- **Two USB keys**
  - One for booting into a Linux live environment.
  - Another to install GRUB on.

> ⚠️ Make sure to correctly identify your devices before proceeding.  
> In my case:
> - `/dev/nvme0n1` → SSD containing Manjaro  
> - `/dev/sdb` → USB key for GRUB installation

---

# Step-by-Step Procedure

1. **Boot into the Linux live environment.**

2. **Prepare the USB key.**  
   - Create a **GPT partition table**.  
   - Add a **single FAT32 partition** (≈ 200 MB).  
   - Set the **boot** and **esp** flags.  
   - This partition serves as the EFI partition that the BIOS will use to load GRUB.  
   - I used *GParted*, but any partitioning tool will work.

3. **Mount the Linux root partition.**  
   ```bash
   sudo mount /dev/nvme0n1p3 /mnt
   ```
   > In my setup, I don’t have a separate `/boot` partition. If you do, mount it under `/mnt/boot`.

   At this point:
   - `/boot` should contain your kernel files.
   - `/boot/grub` should include GRUB and its configuration file `grub.cfg`.

4. **Mount the EFI partition (USB key).**  
   ```bash
   sudo mount /dev/sdb1 /mnt/boot/efi
   ```

5. **Mount the necessary system directories.**  
   ```bash
   sudo mount --bind /dev /mnt/dev
   sudo mount --bind /proc /mnt/proc
   sudo mount --bind /sys /mnt/sys
   sudo mount --bind /run /mnt/run
   ```

6. **Chroot into your system.**  
   ```bash
   sudo chroot /mnt
   ```

7. **Install GRUB to the USB drive.**  
   ```bash
   grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=GRUB --boot-directory=/boot --recheck --removable /dev/sdb
   ```

8. **Exit the chroot and unmount.**  
   ```bash
   exit
   sudo umount -R /mnt
   ```

---

# Final Notes
That’s it! GRUB is now successfully installed on the USB key!  
It’s not necessary to run `grub-mkconfig` or `update-grub` afterward, since `grub.cfg` already exists and is up to date.

This setup allowed me to continue using my Manjaro system seamlessly while investigating possible recovery options for the failed SSD.
