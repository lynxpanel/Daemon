#!/bin/bash

# gets linux id & codename.
. /etc/os-release;
ID="$ID";
CODENAME="$VERSION_CODENAME";

# supported ids & codenames.
SUPPORTED_IDS=(debian ubuntu);
SUPPORTED_VERSION_CODENAMES=(bookworm);

# ANSI escape codes
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;34m"
NC="\033[0;0m"

checkDistro()
{
    # informs the user about the process.

    clear && echo -e "$BLUE[INFO]$NC Checking if your distro is compatible with this version of the installer.";
    
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
        echo -e "$YELLOW[WARN]$NC $ID is not yet supported!";
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
        echo -e "$YELLOW[WARN]$NC $ID $CODENAME is not yet supported!";
        exit 1;
    fi

    # returns success if Linux is supported.

    echo -e "$GREEN[INFO]$NC Check complete. Your distro is compatible with this version of the installer.";
}

installNodeJS()
{

    # informs the user and updates the system.
    
}

# Main code
checkDistro
