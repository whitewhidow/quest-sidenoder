![screen](.github/screen.gif)

### Installation:
Download and run one of the available binaries:
```
https://github.com/whitewhidow/quest-sidenoder/releases/new
```
or clone the repo, and run the app (requires node) :
```
git clone https://github.com/whitewhidow/quest-sidenoder.git
cd quest-sidenoder/
npm install
npm start
```
Please report any issues here :

https://github.com/whitewhidow/quest-sidenoder/issues

## Dependencies:



#### linux:
Install adb, aapt and rclone using these commands:
```
sudo apt install adb
sudo apt install android-sdk-build-tools
curl https://rclone.org/install.sh | sudo bash
```



#### mac/osx:
Install adb and rclone using these commands:
```
brew install android platform-tools
curl https://rclone.org/install.sh | sudo bash
```
Download aapt from here and add to $PATH:
```
https://androidaapt.com/
```





#### windows:
Download adb, aapt and rclone from here and add to $PATH:
```
https://dl.google.com/android/repository/platform-tools-latest-windows.zip
https://androidaapt.com/
https://downloads.rclone.org/v1.53.2/rclone-v1.53.2-windows-amd64.zip
```
Install winfsp and reboot:
```
https://github.com/billziss-gh/winfsp/releases/download/v1.8/winfsp-1.8.20304.msi
```



<!--
https://stackoverflow.com/a/44272417/1501189
https://www.xda-developers.com/adb-fastboot-any-directory-windows-linux/

adb (install globally)
https://dl.google.com/android/repository/platform-tools-latest-windows.zip

rclone (install globally)
https://downloads.rclone.org/v1.53.2/rclone-v1.53.2-windows-386.zip
https://downloads.rclone.org/v1.53.2/rclone-v1.53.2-windows-amd64.zip

winfsp (reboot)
https://github.com/billziss-gh/winfsp/releases/download/v1.8/winfsp-1.8.20304.msi

-->
