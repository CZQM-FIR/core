---
icon: lucide/clipboard
description: The CZQM tool for managing and tracking documents and policies.
alias: DMS
---

# Document Management System

CZQM uses a tool called the Document Management System or **DMS** to manage and track our FIR documents and policies. Controllers use this system to view and acknowledge new or updated policies. Staff use this system to upload documents and track user acknowledgements.

This guide has been split in 2 parts:

1. [How to use the DMS as a controller](#how-to-use-the-dms-as-a-controller)
2. [How to use the DMS as a staff member](#how-to-use-the-dms-as-a-staff-member)

!!! warning

    This article covers a new system which may be updated as it is released. Because of this, this article may not be 100% up to date with the feature itself.

## How to use the DMS as a controller

As a controller, there are two main things you will use the DMS for. First, you can use the DMS to view any and all documents and policies in the FIR. Second, you will use the DMS to "acknowledge" documents so that you stop receiving notifications about them.

### Viewing documents

To view a document, first navigate to the DMS page which can be found [here](https://czqm.ca/docs). This page will show you a list of documents organized by category. Documents that require you to acknowledge them will be marked with a **_Acknowledgement required_** badge.

Clicking on a document will bring you to a page that displays information about the document. Here you can find information such as its effective date, and expiry date, if / when you acknowledged the document. There is a blue "View Document" button that will take you to the PDF of the document.

### Acknowledging Documents

Whenever a new version of a document is published, you may be required to acknowledge the change. Items such as guides will likely not require your acknowledgement; however, policy items will require you to acknowledge their changes.

In the document list, items that still need to be required will be marked with an **_Acknowledgement Required_** badge.

Once on the document's page, there will be a button available to click which will acknowledge the document. By acknowledging the document, you are saying that you have read and understand the document. Once the document has been acknowledged, you will stop receiving notifications about it.

### Notifications

In order to ensure that controllers review new policy items in a timely fashion, a notification will be sent to controllers via Discord when they connect to the network with an outstanding document. This is there to ensure that documents are reviewed in a timely fashion to ensure that we are able to provide the best of service on the VATSIM network.

These notifications are mandatory notifications which cannot be disabled. In order to silence them, you must [acknowledge the document](#acknowledging-documents).

## How to use the DMS as a staff member

### Creating a new document

Every document must belong to a group. These groups are managed on the main page of the [overseer DMS page](https://overseer.czqm.ca/a/dms). You can either select a group by clicking "Manage Documents" or create a new group by selecting "Create New Group".

Once inside of a group, you can use the blue "Create Document" button to create a new document. In order to create the document, you must provide certain information:

- **Document Name** - The name of the document
- **Short URL** - The short identifier for this document used in URLs
- **Description** - A short, optional description of the document
- **Required** - If this document is required for controllers to acknowledge
- **Sort Order** - Documents are sorted within their groups first from 0-99 of the sort order value then alphabetically

Once that is completed, you can use the "Create Document" button to finalize the document creation.

Now that the document has been created, you must add an asset. An asset represents each version of the document.

To create an asset, you must add the Version Number, Effective Date, an optional Expiry Date, if the asset should be public, and upload the PDF itself. Once all of that is done, you can click Upload Asset. In the list of assets below, you can look for a list of assets and find which asset is current. The current asset is determined based on the most recent, public, non-expired asset.
