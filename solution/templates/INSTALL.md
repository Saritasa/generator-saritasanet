Install
=======

Project Setup
-------------

1. Here are steps you need to do to setup environment to be able to develop. You need following software installed:

    - Visual Studio 2017 (https://www.visualstudio.com/downloads/download-visual-studio-vs.aspx)
    - psake (https://github.com/psake/psake)

    You can easily install psake with Chocolatey package manager. To do that run `cmd` as administrator and type commands:

    ```
    D:\> @powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))" && SET PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin
    D:\> choco install psake
    ```

2. View list of available psake commands:

    ```
    D:\proj\> psake help
    ```
