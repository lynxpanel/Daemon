#!/bin/bash

# script directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# script Version. DON'T TOUCH!
VER=1.0

# gets linux id & codename.
. /etc/os-release;
ID="$ID";
CODENAME="$VERSION_CODENAME";

# supported ids & codenames. DON'T TOUCH!
SUPPORTED_IDS=(debian ubuntu);
SUPPORTED_VERSION_CODENAMES=(bookworm);

# ANSI escape codes.
GREEN="\033[0;32m";
BLUE="\033[0;34m";
YELLOW="\033[0;33m";
RED="\033[0;31m";
PURPLE="\033[0;35m";
NC="\033[0;0m";

BOLD='\033[1m'
RESET='\033[0m'

# Debug boolean.
DEBUG=false;

checkArgs()
{
    for arg in "$@"; do
        if [ "$arg" = "--debug" ] 
        then
            DEBUG=true;
        elif [ "$arg" = "--help" ] 
        then
            echo "Use --debug to activate debug mode. (Debug mode disables many checks. NEVER USE IN PRODUCTION!)";
            echo "Use --help to see this.";
            exit 1;
        fi
    done
};

checkRoot()
{
    # checks if the script gets executed as root or via sudo & if the debug mode is enabled.
    if [ "$1" = true ]; then
        if [ "$EUID" -ne 0 ]; then
            echo -e "$PURPLE[DEBUG]$NC You run this script in the debug mode. Auto-exit is disabled.";
            echo -e "$YELLOW[WARN]$NC Execute the script as root or with sudo.";
        fi
    else
        if [ "$EUID" -ne 0 ]; then
            echo -e "$YELLOW[WARN]$NC Execute the script as root or with sudo.";
            exit 1;
        fi
    fi
};

checkDistro()
{
    if [ "$1" = true ]; then
        # informs the user about the process.
        echo -e "$BLUE[INFO]$NC Checking if your distro is compatible with this version of the installer.";
        
        # loops through SUPPORTED_IDS.
        ID_SUPPORTED=false;
        for i in "${SUPPORTED_IDS[@]}"; do
            if [ "$i" == "$ID" ]; then
                ID_SUPPORTED=true;
                break
            fi
        done

        # checks if the ID is supported yet or not.
        if [ "$ID_SUPPORTED" = false ]; then
            echo -e "$PURPLE[DEBUG]$NC You run this script in the debug mode. Auto-exit is disabled.";
            echo -e "$YELLOW[WARN]$NC $BOLD $ID $RESET is not yet supported!";
        fi

        # loops through SUPPORTED_VERSION_CODENAMES.
        CODENAME_SUPPORTED=false;
        for v in "${SUPPORTED_VERSION_CODENAMES[@]}"; do
            if [ "$v" == "$CODENAME" ]; then
                CODENAME_SUPPORTED=true;
                break
            fi
        done

        # checks if the CODENAME is supported yet or not.
        if [ "$CODENAME_SUPPORTED" = false ]; then
            echo -e "$PURPLE[DEBUG]$NC You run this script in the debug mode. Auto-exit is disabled.";
            echo -e "$YELLOW[WARN]$NC $BOLD $CODENAME $RESET is not yet supported!";
        fi

        # returns success if Linux is supported.
        echo -e "$GREEN[INFO]$NC Check complete. Your distro is compatible with this version of the installer.";
    else
        # informs the user about the process.
        echo -e "$BLUE[INFO]$NC Checking if your distro is compatible with this version of the installer.";
        
        # loops through SUPPORTED_IDS.
        ID_SUPPORTED=false;
        for i in "${SUPPORTED_IDS[@]}"; do
            if [ "$i" == "$ID" ]; then
                ID_SUPPORTED=true;
                break
            fi
        done

        # checks if the ID is supported yet or not.
        if [ "$ID_SUPPORTED" = false ]; then
            echo -e "$YELLOW[WARN]$NC $BOLD $ID $RESET is not yet supported!";
            exit 1;
        fi

        # loops through SUPPORTED_VERSION_CODENAMES.
        CODENAME_SUPPORTED=false;
        for v in "${SUPPORTED_VERSION_CODENAMES[@]}"; do
            if [ "$v" == "$CODENAME" ]; then
                CODENAME_SUPPORTED=true;
                break
            fi
        done

        # checks if the CODENAME is supported yet or not.
        if [ "$CODENAME_SUPPORTED" = false ]; then
            echo -e "$YELLOW[WARN]$NC $BOLD $CODENAME $RESET is not yet supported!";
            exit 1;
        fi

        # returns success if Linux is supported.
        echo -e "$GREEN[INFO]$NC Check complete. Your distro is compatible with this version of the installer.";
    fi
};

installDependencies()
{
    # creates the tmp directory for debugging purposes
    mkdir -p "$SCRIPT_DIR/tmp";

    # checks if the debug arg is set.
    if [ "$1" = true ]; then
        # informs the user and updates the system.
        echo -e "$BLUE[INFO]$NC Updating the system.";
        echo -e "$PURPLE[DEBUG]$NC apt update -y";
        apt update -y;
        echo -e "$PURPLE[DEBUG]$NC apt upgrade -y";
        apt upgrade -y;

        # informs the user and installs NodeJS 
        echo -e "$BLUE[INFO]$NC Installing NodeJS.";
        echo -e "$PURPLE[DEBUG]$NC apt install nodejs npm -y";
        apt install nodejs npm -y;
        echo -e "$PURPLE[DEBUG]$NC wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash";
        wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash;
        echo -e "$PURPLE[DEBUG]$NC export NVM_DIR="$HOME/.nvm"";
        export NVM_DIR="$HOME/.nvm";
        echo -e "$PURPLE[DEBUG]$NC [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"";
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh";
        echo -e "$PURPLE[DEBUG]$NC [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"";
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion";
        echo -e "$PURPLE[DEBUG]$NC nvm install --lts";
        nvm install --lts;
        echo -e "$GREEN[INFO]$NC Dependencies installed."
    else
        # informs the user and updates the system.
        echo -e "$BLUE[INFO]$NC Updating the system.";
        nohup apt update -y > "$SCRIPT_DIR/tmp/apt_update.log" 2>&1;
        nohup apt upgrade -y > "$SCRIPT_DIR/tmp/apt_upgrade.log" 2>&1;

        # informs the user and installs NodeJS 
        echo -e "$BLUE[INFO]$NC Installing NodeJS.";
        nohup apt install nodejs npm -y > "$SCRIPT_DIR/tmp/apt_install.log" 2>&1;
        wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash > $SCRIPT_DIR/tmp/wget.log 2>&1;
        export NVM_DIR="$HOME/.nvm";
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh";
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion";
        nvm install --lts > /$SCRIPT_DIR/tmp/nvm.log 2>&1;
        echo -e "$GREEN[INFO]$NC Dependencies installed."
    fi
};

userInterface()
{
    while true; do
    clear;
        echo -e "-----------------------------------------------------------------";
        echo -e "$GREEN[INFO] $BLUE[1]$NC Install the Daemon.";
        echo -e "$GREEN[INFO] $BLUE[2]$NC Reinstall the Daemon.";
        echo -e "$GREEN[INFO] $BLUE[3]$NC Start the Daemon.";
        echo -e "$GREEN[INFO] $BLUE[4]$NC Stop the Daemon.";
        echo -e "$GREEN[INFO] $BLUE[5]$NC Activate the Daemon Maintenance Mode.";
        echo -e "$GREEN[INFO] $BLUE[6]$NC Edit the Daemon Configs.";
        echo -e "$GREEN[INFO] $BLUE[0]$NC Close this Script.";
        echo -e "-----------------------------------------------------------------";
        echo -e "$BLUE[INFO]$NC Choose what you want to do: " && read number;

    if [[ "$number" =~ ^[0-9]+$ ]]; then
        case "$number" in
            1)
                echo "not yet implemented.";
                ;;
            2)
                echo "not yet implemented.";
                ;;
            3)
                echo "not yet implemented.";
                ;;
            4)
                echo "not yet implemented.";
                ;;
            5)
                echo "not yet implemented.";
                ;;
            6)
                echo "not yet implemented.";
                ;;
            0)
                echo -e "$GREEN[INFO]$NC Exiting . . .";
                exit 1;
                ;;
        esac;
    else
        echo -e "$YELLOW[WARN]$NC You did not enter a number."
    fi
    done
};

# Main code
clear && echo -e "$GREEN[INFO]$NC Installer is running on$BOLD Version $VER $RESET";

checkArgs "$@";
checkRoot "$DEBUG";
checkDistro "$DEBUG";
installDependencies "$DEBUG";
userInterface "$DEBUG";