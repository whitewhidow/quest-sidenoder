@echo off

mkdir sideloader_deps 2> NUL

IF EXIST "C:\Program Files\7-Zip\7z.exe" (
  echo 7-zip is present
) ELSE (
  echo Downloading and installing 7zip'
  curl https://www.7-zip.org/a/7z1900-x64.exe -o sideloader_deps/7zip.exe
  START /WAIT sideloader_deps/7zip.exe
)




echo Downloading rclone
curl -L https://downloads.rclone.org/rclone-current-windows-amd64.zip -o sideloader_deps/rclone.zip
echo Downloading adb
curl -L https://dl.google.com/android/repository/platform-tools-latest-windows.zip  -o sideloader_deps/android-tools.zip

cd sideloader_deps


echo Unzipping rclone
"C:\Program Files\7-Zip\7z.exe" x -y rclone.zip > nul
echo Unzipping adb
"C:\Program Files\7-Zip\7z.exe" x -y android-tools.zip > nul
echo Combining folders
SET COPYCMD=/Y
move /y rclone-v1.53.3-windows-amd64\*.* platform-tools\
del rclone-v1.53.3-windows-amd64\
echo Adding to PATH
setx PATH "%PATH%;%~dp0sideloader_deps\platform-tools"

cd ..


IF EXIST "%~dp0SideNoder.exe" (
  echo
) else (
      echo Downloading and installing NodeJs
      curl -L https://nodejs.org/dist/v14.15.1/node-v14.15.1-x86.msi  -o sideloader_deps/node-v14.15.1-x86.msi
      START /WAIT sideloader_deps/node-v14.15.1-x86.msi

      echo Downloading and installing Git
      curl -L https://github.com/git-for-windows/git/releases/download/v2.29.2.windows.2/Git-2.29.2.2-64-bit.exe  -o sideloader_deps/Git-2.29.2.2-64-bit.exe
      START /WAIT sideloader_deps/Git-2.29.2.2-64-bit.exe
)

curl -L https://github.com/billziss-gh/winfsp/releases/download/v1.8/winfsp-1.8.20304.msi  -o sideloader_deps/winfsp-1.8.20304.msi
START /WAIT sideloader_deps/winfsp-1.8.20304.msi

cls
echo Dependencies installed, Please reboot to complete the installation.
IF EXIST "%~dp0SideNoder.exe" (
  echo After rebooting you can run "SideNoder.exe"
) else (
  echo After rebooting you can run "windows-launcher.bat"
)
pause