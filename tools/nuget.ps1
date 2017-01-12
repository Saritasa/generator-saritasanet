function Install-NugetCli
{
    [CmdletBinding()]
    param
    (
        [Parameter(Mandatory = $true)]
        [string] $Destination
    )

    $nugetExePath = "$Destination\nuget.exe"
    
    if (!(Test-Path $nugetExePath))
    {
        Invoke-WebRequest 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe' -OutFile $nugetExePath
    }
}

function Invoke-NugetRestore
{
    [CmdletBinding()]
    param
    (
        [Parameter(Mandatory = $true, HelpMessage = 'Path to project. All NuGet packages from included projects will be restored.')]
        [string] $ProjectPath
    )

    Install-NugetCli -Destination $PSScriptRoot
    $nugetExePath = "$PSScriptRoot\nuget.exe"

    $solutionDirectory = (Get-Item $ProjectPath).Directory.Parent.FullName
    $solutionDirectory = "$solutionDirectory\"
    $packagesDirectory = (Get-Item $ProjectPath).Directory.FullName
    $packagesDirectory = "$packagesDirectory\packages\"
    &$nugetExePath 'restore' $ProjectPath '-SolutionDirectory' $solutionDirectory
    if ($LASTEXITCODE)
    {
        throw 'Nuget restore failed.'
    }
}