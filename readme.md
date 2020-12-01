**SideNoder** - A **cross platform sideloader** for Quest(1&2) standalone vr headset.

![screen](.github/screen.gif)

## DOWNLOADS OF LAST COMPILED VERSION:
```
https://github.com/whitewhidow/quest-sidenoder/releases
```

## DEPENDENCIES REQUIRED TO RUN LAST COMPILED VERSION:
#### windows:
First run the `windows-install.bat` file included with the release

#### linux:
First install adb and rclone:
```
sudo apt install adb
curl https://rclone.org/install.sh | sudo bash
```
#### mac/osx:
First install adb, rclone and osxfuse:
```
brew cask install android-platform-tools
curl https://rclone.org/install.sh | sudo bash
brew cask install osxfuse
```
<details>
<summary>Running big sur?</summary>
For mounting issues with Sidenoder on Osx Big Sur, Please install the latest osxfuse (prerelease)
https://github.com/osxfuse/osxfuse/releases
</details>


Please report any issues here :

https://github.com/whitewhidow/quest-sidenoder/issues | https://t.me/whitewhidow | https://discord.gg/pVMsAyYhAf


---
Or instead of using the above precompiled binaries, you can manually run the app using the below instructions.

---

## MANUALLY RUNNING AND COMPILING THE LATEST VERSION:
#### windows:
1. Download and install GIT from `https://git-scm.com/download/win`
2. Run the following in a command line terminal (cmd):
    ```
    git clone https://github.com/whitewhidow/quest-sidenoder.git
    cd quest-sidenoder/
    windows-install.bat
    npm install
    ```
3. Reboot and launch the app from the command line terminal:
    ```
    cd C:\wherever\you\installed\quest-sidenoder
    npm start
    ```


#### linux:
```
sudo apt install git adb nodejs
curl https://rclone.org/install.sh | sudo bash
git clone https://github.com/whitewhidow/quest-sidenoder.git
cd quest-sidenoder/
npm install
npm start
```

#### mac/osx:
```
brew install git
curl https://rclone.org/install.sh | sudo bash
brew cask install android-platform-tools
brew cask install osxfuse
git clone https://github.com/whitewhidow/quest-sidenoder.git
cd quest-sidenoder/
npm install
npm start
```
<details>
<summary>Running big sur?</summary>
For mounting issues with Sidenoder on Osx Big Sur, Please install the latest osxfuse (prerelease) from `https://github.com/osxfuse/osxfuse/releases`
</details>
Please report any issues here :

https://github.com/whitewhidow/quest-sidenoder/issues | https://t.me/whitewhidow | https://discord.gg/pVMsAyYhAf
