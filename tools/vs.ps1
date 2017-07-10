# used to wait for devenv to fully launch before calling any code against it
# https://msdn.microsoft.com/en-us/library/ms228772.aspx
$messageFilterDef = @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class MessageFilter : IOleMessageFilter
{
    //
    // Class containing the IOleMessageFilter
    // thread error-handling functions.

    // Start the filter.
    public static void Register()
    {
        IOleMessageFilter newFilter = new MessageFilter(); 
        IOleMessageFilter oldFilter = null; 
        CoRegisterMessageFilter(newFilter, out oldFilter);
    }

    // Done with the filter, close it.
    public static void Revoke()
    {
        IOleMessageFilter oldFilter = null; 
        CoRegisterMessageFilter(null, out oldFilter);
    }

    //
    // IOleMessageFilter functions.
    // Handle incoming thread requests.
    int IOleMessageFilter.HandleInComingCall(int dwCallType, 
        System.IntPtr hTaskCaller, int dwTickCount, System.IntPtr 
        lpInterfaceInfo) 
    {
        //Return the flag SERVERCALL_ISHANDLED.
        return 0;
    }

    // Thread call was rejected, so try again.
    int IOleMessageFilter.RetryRejectedCall(System.IntPtr 
        hTaskCallee, int dwTickCount, int dwRejectType)
    {
        if (dwRejectType == 2)
        // flag = SERVERCALL_RETRYLATER.
        {
            // Retry the thread call immediately if return >=0 & 
            // <100.
            return 99;
        }
        // Too busy; cancel call.
        return -1;
    }

    int IOleMessageFilter.MessagePending(System.IntPtr hTaskCallee, 
        int dwTickCount, int dwPendingType)
    {
        //Return the flag PENDINGMSG_WAITDEFPROCESS.
        return 2; 
    }

    // Implement the IOleMessageFilter interface.
    [DllImport("Ole32.dll")]
    private static extern int 
        CoRegisterMessageFilter(IOleMessageFilter newFilter, out 
        IOleMessageFilter oldFilter);
}

[ComImport(), Guid("00000016-0000-0000-C000-000000000046"), 
InterfaceTypeAttribute(ComInterfaceType.InterfaceIsIUnknown)]
interface IOleMessageFilter 
{
    [PreserveSig]
    int HandleInComingCall( 
        int dwCallType, 
        IntPtr hTaskCaller, 
        int dwTickCount, 
        IntPtr lpInterfaceInfo);

    [PreserveSig]
    int RetryRejectedCall( 
        IntPtr hTaskCallee, 
        int dwTickCount,
        int dwRejectType);

    [PreserveSig]
    int MessagePending( 
        IntPtr hTaskCallee, 
        int dwTickCount,
        int dwPendingType);
}
"@
Add-Type -TypeDefinition $messageFilterDef

function Get-VSPath
{
    if ([Environment]::Is64BitOperatingSystem)
    {
        $registryPath = 'HKLM:\software\WOW6432Node\Microsoft\VisualStudio\SxS\VS7'
    }
    else
    {
        $registryPath = 'HKLM:\software\Microsoft\VisualStudio\SxS\VS7'
    }

    $vsNode = Get-Item -Path $registryPath
    $vsNode |
        Select-Object -ExpandProperty Property |
        Sort-Object -Descending |
        Select-Object @{Name='Path';Expression={$vsNode.GetValue($_) }}, @{Name='Version';Expression={$_}}
}

function Load-EnvDTE
{
    $vsInfo =
        Get-VSPath |
        Select-Object Version, @{Name='AsmPath';Expression={"$($_.Path)Common7\IDE\PublicAssemblies"}} |
        Where-Object { Test-Path "$($_.AsmPath)\EnvDTE.dll" } |
        Select-Object -First 1
    if (!$vsInfo)
    {
        Write-Error 'Could not locate EnvDTE.dll file'
    }

    Get-ChildItem $vsInfo.AsmPath -Filter 'EnvDTE*.dll' |
        ForEach-Object {
            Add-Type -Path $_.FullName -PassThru |
                Where-Object {$_.IsPublic -and $_.BaseType} |
                Sort-Object Name
        }
    $type = [Type]::GetTypeFromProgID("VisualStudio.DTE.$($vsInfo.Version)", $true)
    $dte = [System.Activator]::CreateInstance($type, $true)
    #$dte.MainWindow.Visible = $true
    $dte.SuppressUI = $true
    $dte
}

function Invoke-VSCommands
{
    [CmdletBinding()]
    param
    (
        [Parameter(Mandatory = $true)]
        [ScriptBlock] $ExecutionCode
    )

    $vs = Load-EnvDTE
    [MessageFilter]::Register()
    try
    {
        Invoke-Command $ExecutionCode -ArgumentList $vs.DTE
    }
    finally
    {
        $vs.DTE.Quit()
        [MessageFilter]::Revoke()
    }
}

function Create-Solution
{
    [CmdletBinding()]
    param
    (
        [Parameter(Mandatory = $true)]
        [string] $FilePath
    )

    $destFolder = Split-Path $FilePath
    New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
    $solutionFileName = Split-Path $FilePath -Leaf
    Invoke-VSCommands {
        param($envdte);
        $envdte.Solution.Create($destFolder, $solutionFileName)
    }
}

function Add-Project
{
    [CmdletBinding()]
    param
    (
        [Parameter(Mandatory = $true)]
        [string] $SolutionPath,
        [Parameter(Mandatory = $true)]
        [string] $ProjectPath
    )

    Write-Host $SolutionPath
    Write-Host $ProjectPath
    Invoke-VSCommands {
        param($envdte);
        $envdte.Solution.Open($SolutionPath)
        $envdte.Solution.AddFromFile($ProjectPath) | Out-Null
    }
}