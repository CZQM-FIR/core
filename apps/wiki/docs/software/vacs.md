---
title: VACS
---

# VACS

VACS is a ground to ground voice communication system (ie. communication between controllers). The intention of VACS is to provice a simplified and streamlined method for coordinating with other controllers both within the CZQM FIR and other adjacent facilities.

VACS **is not** a replacement for TeamSpeak. As required by policy, CZQM controllers must be in the VATCAN teamspeak while controlling. VACS provides a simpler method for coordinating and communicating with individual controllers and is intended to augment existing communication systems.

## Installation

VACS is available for all platforms. We recommend following the official VACS installation guide which can be found [here](https://docs.vacs.network/getting-started/installation/). You do not need to install this on the same device as your Euroscope installation.

## Configuration

Before you can begin to use VACS, you must first ensure it's configured for your system correctly. This will be a brief summary of the configuration steps. For more info, see the [VACS Documentation](https://docs.vacs.network/settings/overview).

### Authentication

Before you can do anything with VACS, you must first log in with your VATSIM account. Click the green "Login via VATSIM" button. Once you've logged in, you may close the web page.

### Audio Devices

You must configure your audio devices. The settings page may be accessed by clicking the wrench and screwdriver icon in the top right. From there, you may configure your audio settings as per your system.

For more information, see the [VACS Audio Settings documentation](https://docs.vacs.network/settings/audio).

### Hotkeys

Hotkeys are a useful way to be able to accept and deny incoming calls without having to open the VACS program every time. To set your prefered hotkeys, navigate to Settings, Hotkeys.

!!! Note

    You can set both the Accept and End call to the same key allowing you to use the same button to control your calls.

More information regarding keybinds can be found [here](https://docs.vacs.network/settings/hotkeys)

### Profiles

The CZQM configuration will be automatically loaded upon connection to a CZQM Position. At a later date, there may be additional profiles which you can chose from by selecting the profiles button.

![1773901998343](../images/vacs/1773901998343.png){width="150"}

## Usage

VACS is fairly intuitive to use; however, there is some important information to know. For a brief summary and for further reading, see the [VACS Documentation](https://docs.vacs.network/using-vacs/during-a-session).

### Making a Call

To make a call, navigate to the station you wish to call. Stations are organized based on geographic region. Navigate to the station that would be responsible for the situation you are calling about. Even if that controller is not online, the call will be routed to the appropriate controller who oversees that position.

!!! note

    You are only able to use VACS to call controllers who are both connected to VATSIM as a controller, and are using VACS.

By clicking on the station you wish to contact, this will initiate a call to the applicable controlelr. The button will light up green with a gray border. Once the receiving controller accespts the call, the button will turn solid green indicating the call has been accepted.

#### Call Source

If you are controlling a position that inherits other positions top-down, you may wish to indicate which position the call is coming from to give context for the receiving controller. By clicking on a call button that belongs to you, it will turn a light orange to indicate this is a _temporary call source_, this will be used for the next call only. To have it stay for future calls, double click the the call button such that it turns dark orange to set it as a _fixed call source_.

It is recommended to set a fixed call source at the begining of your session.

#### Priority Calls

Should you be making an urgent call, you may indicate such to the receiving controller. By clicking the **PRIO** button in the top left prior to placing a call, the call will be marked as priority which will result in yellow flashing on the call button for the receiving controller and an additional audible aid.

### Receiving a Call

When another controller calls you, the relevant sector button of the caller will start flashing green to indicate the incoming call. To accept a call, you may click any of the flashing green indicators be it the station call button in the interface, on the right hand side, or the phone button. If you have multiple calls at once, you may determine which to answer first.

### Ending a Call

To end a call. Press the **END** button at the bottom of the interface.
