@echo off

mkdir sideloader_deps 2> NUL

IF EXIST "C:\Program Files\7-Zip\7z.exe" (
  echo 7-zip is present
) ELSE (
  echo Downloading and installing 7zip'
  curl  --ssl-no-revoke https://www.7-zip.org/a/7z1900-x64.exe -o sideloader_deps/7zip.exe
  START /WAIT sideloader_deps/7zip.exe
)




echo Downloading rclone
curl  --ssl-no-revoke -L https://downloads.rclone.org/rclone-current-windows-amd64.zip -o sideloader_deps/rclone.zip
echo Downloading adb
curl  --ssl-no-revoke -L https://dl.google.com/android/repository/platform-tools-latest-windows.zip  -o sideloader_deps/android-tools.zip



cd sideloader_deps


echo Unzipping rclone
"C:\Program Files\7-Zip\7z.exe" x -y rclone.zip > NUL
echo Unzipping adb
"C:\Program Files\7-Zip\7z.exe" x -y android-tools.zip > NUL
echo Combining folders
SET COPYCMD=/Y
move /y rclone-v1.53.4-windows-amd64\rclone.exe platform-tools\rclone.exe > NUL
del /F /Q rclone-v1.53.4-windows-amd64\  > NUL
echo Adding to PATH
:: Get System PATH
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path') do set syspath=%%B

:: Get User Path
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path') do set userpath=%%B

:: TODO:check if already in path
setx PATH "%userpath%;%~dp0sideloader_deps\platform-tools"
cd ..


IF EXIST "%~dp0sidenoder.exe" (
  echo .
) else (
    IF EXIST "%programfiles(x86)%\nodejs\node.exe" (
      echo NodeJS is present
    ) ELSE (
      echo Downloading and installing NODEJS'
      curl  --ssl-no-revoke https://nodejs.org/dist/v14.15.1/node-v14.15.1-x86.msi -o sideloader_deps/node-v14.15.1-x86.msi
      START /WAIT sideloader_deps/node-v14.15.1-x86.msi
    )

    IF EXIST "C:\Program Files\Git\cmd\git.exe" (
        echo Git is present
    ) ELSE (
        echo Downloading and installing Git
        curl  --ssl-no-revoke -L https://github.com/git-for-windows/git/releases/download/v2.29.2.windows.2/Git-2.29.2.2-64-bit.exe  -o sideloader_deps/Git-2.29.2.2-64-bit.exe
        START /WAIT sideloader_deps/Git-2.29.2.2-64-bit.exe
    )
)

IF EXIST "%programfiles(x86)%\WinFsp\Bin\diag.bat" (
    echo WinFsp is present
    echo .
    echo .
    echo Dependencies installed.
    IF EXIST "%~dp0SideNoder.exe" (
      echo You can run "SideNoder.exe"
    ) else (
      echo You can run "windows-launcher.bat"
    )
    pause
    exit
) ELSE (
    curl  --ssl-no-revoke -L https://github.com/billziss-gh/winfsp/releases/download/v1.8/winfsp-1.8.20304.msi  -o sideloader_deps/winfsp-1.8.20304.msi
    START /WAIT sideloader_deps/winfsp-1.8.20304.msi
    echo .
    echo .
    echo Dependencies installed, Please reboot to complete the installation.
    IF EXIST "%~dp0SideNoder.exe" (
      echo After rebooting you can run "SideNoder.exe"
    ) else (
      echo "After rebooting you can run \"npm install\"(once) and \"npm start\" to start the SideNoder"
    )
    pause
    exit
)
