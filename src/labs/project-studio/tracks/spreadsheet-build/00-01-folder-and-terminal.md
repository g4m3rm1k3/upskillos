---
title: 0.1 — Your Project Folder and the Terminal
track: Bootcamp 1 · Professional Foundations
trackOrder: 1
runtime: none
---

This is the first lesson of a bootcamp: the road from writing scripts that work to working as a professional full-stack software engineer. You'll learn the everyday tools, TypeScript and later C#, testing, databases, security, how software is shipped and run, how teams work from a client's requirements, and finally how to get through the interviews.

Every subject goes the same way. You **learn** it. You **experiment** with it in a playground folder, where breaking things is the point. Then you see **how it's used in the real world**, on one project that grows through the whole bootcamp: a spreadsheet, the kind of program Excel is. A spreadsheet is a good place to practise because it needs nearly everything professionals build: an interface people use, a programming language inside it (formulas), and later a server, a database, accounts and live collaboration. Later still, clients arrive with requests of their own for it.

You know how to write Python scripts. That's all this bootcamp assumes. Everything else, starting with the terminal in this lesson, is explained when it first appears. If you've hacked around in a terminal before, this first sprint goes quickly: the checks are the same either way.

This window has four parts. The **lesson** is on the right (you're reading it). The **file tree** on the left lists the files in your project folder. The **editor** in the middle is where you type code. The **terminal** at the bottom is where you run programs. Only this lesson exists until you choose a folder.

## Make the project's folder

A program you build is a folder of files. Everything in this series lives in one folder, which you're about to make.

1. Click **Choose folder…** in the middle of this window.
2. In the window that opens, go to your **Documents** folder.
3. Click **New folder**, name it `spreadsheet`, and press Enter.
4. Select the new `spreadsheet` folder and click **Select Folder**.

The folder has an address, called its **path**, that says how to reach it from the top of the drive. On Windows it looks like this, with your own user name in the middle:

```text
C:\Users\you\Documents\spreadsheet
```

Read it left to right: the drive `C:`, then the folder `Users`, then your user's folder, then `Documents`, then `spreadsheet`. Each `\` means "go inside". (On macOS paths use `/` and start with `/`, like `/Users/you/Documents/spreadsheet`.)

This folder is yours, not the app's. You can open it in File Explorer or any other editor, and it stays when you close this app.

## Meet the terminal

The panel at the bottom of the window is a **terminal**. It runs a **shell**, a program whose whole job is to run other programs when you type their names. On Windows the shell here is **Windows PowerShell**. (On macOS it's **zsh**. Where the two differ, this series says so.)

The text at the start of the line is the **prompt**:

```text
PS C:\Users\you\Documents\spreadsheet>
```

`PS` means PowerShell. The path after it is the shell's **current directory**, the folder that commands act on unless you say otherwise. It starts in your project folder.

Click in the terminal and type this, then press **Enter**:

```powershell
pwd
```

PowerShell answers:

```text
PS C:\Users\you\Documents\spreadsheet> pwd

Path
----
C:\Users\you\Documents\spreadsheet


PS C:\Users\you\Documents\spreadsheet>
```

A new prompt at the end means the shell has finished and is waiting for your next command.

`pwd` stands for "print working directory" (*working directory* is another name for the current directory). It's the same thing Python's `os.getcwd()` tells you.

## Look inside the folder

Type:

```powershell
ls
```

Nothing comes back, and that's the right answer: the folder is empty. `ls` means "list": it shows what's in the current directory, like the file tree on the left does.

In PowerShell, `ls` is a short nickname, called an **alias**, for a longer command named `Get-ChildItem`. `pwd` is an alias for `Get-Location`. The short names exist because they're the names these commands have on macOS and Linux, so the same habits work everywhere.

## Make a folder from the terminal

Type:

```powershell
mkdir scratch
```

```text
PS C:\Users\you\Documents\spreadsheet> mkdir scratch


    Directory: C:\Users\you\Documents\spreadsheet


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----         10/2/2026   7:28 PM                scratch
```

`mkdir` means "make directory", and *directory* is another word for folder. PowerShell describes what it made: `Mode` starting with `d` means it's a directory. (On macOS, `mkdir` prints nothing when it works. Silence means success there.)

Look at the file tree on the left: `scratch` is there. The terminal and the file tree look at the same real folder on your disk.

```check
dir scratch -- Type mkdir scratch in the terminal and press Enter.
```

## Move around

`cd` means "change directory": it moves the shell into another folder. Before you try it, a prediction:

```predict
question: You're about to type `cd scratch`, then `cd ..`. Which folder will `cd ..` take you to?
choice: spreadsheet
choice: Documents
choice: scratch
answer: spreadsheet
explain: `..` always means the parent: the folder the current one is inside. After `cd scratch` you're in `spreadsheet\scratch`, whose parent is `spreadsheet`. (A single `.` means "this folder" itself.)
verify: (Get-Item scratch).Parent.Name
```

Type these three commands one at a time, pressing Enter after each:

```powershell
cd scratch
pwd
cd ..
```

After `cd scratch`, the prompt changes, because the current directory changed:

```text
PS C:\Users\you\Documents\spreadsheet> cd scratch
PS C:\Users\you\Documents\spreadsheet\scratch> pwd

Path
----
C:\Users\you\Documents\spreadsheet\scratch


PS C:\Users\you\Documents\spreadsheet\scratch> cd ..
PS C:\Users\you\Documents\spreadsheet>
```

`..` always means "the folder this one is inside" (its *parent*), so `cd ..` takes you back up to `spreadsheet`.

`scratch` here is a **relative path**: it's looked up starting from the current directory. `C:\Users\you\Documents\spreadsheet\scratch` is an **absolute path**: it starts from the top of the drive, so it means the same folder wherever you are.

This explains a Python mystery you may have met already. `open("data.csv")` uses a relative path, so Python looks for `data.csv` in the current directory: the folder the terminal was in when you ran the script, *not* the folder the script is in. Run the same script from a different folder and it "can't find" a file that's sitting right next to it.

## When the shell doesn't know a command

Type this, misspelled on purpose:

```powershell
pyhton --version
```

```text
PS C:\Users\you\Documents\spreadsheet> pyhton --version
pyhton : The term 'pyhton' is not recognized as the name of a cmdlet, function, script file, or
operable program. Check the spelling of the name, or if a path was included, verify that the path
is correct and try again.
At line:1 char:1
+ pyhton --version
+ ~~~~~~
    + CategoryInfo          : ObjectNotFound: (pyhton:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
```

Error messages look alarming, but read the first line and most of the answer is there: *the term 'pyhton' is not recognized*. The shell looked for a program called `pyhton` and found none. The `+ ~~~~~~` line underlines the part it didn't understand. The last lines are details for other programs to read; you can usually skip them.

Now spell it correctly:

```powershell
python --version
```

```text
PS C:\Users\you\Documents\spreadsheet> python --version
Python 3.13.14
```

(Your version number may be different.) The shell found the Python you already use to run your scripts. *How* it finds programs by name is the next lesson.

## Delete the scratch folder

Type:

```powershell
Remove-Item scratch
```

`Remove-Item` deletes a file or folder (its alias is `rm`). It prints nothing when it works. Check with `ls`: the folder is gone, from the file tree too.

**Deleting from the terminal skips the Recycle Bin.** There's no undo. If the folder still has files in it, PowerShell stops and asks first:

```text
Confirm
The item at C:\Users\you\Documents\spreadsheet\scratch has children and the Recurse parameter was
 not specified. If you continue, all children will be removed with the item. Are you sure you want
to continue?
[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "Y"):
```

Typing `n` and Enter cancels. Read the question before pressing Enter: the default answer is Yes.

```check
missing scratch -- Type Remove-Item scratch in the terminal and press Enter.
```

Two habits that save a lot of typing: press **↑** to bring back the previous command, and press **Tab** while typing a file or folder name to have the shell finish it for you.

## Your playground

`scratch` was for one lesson. Now make a folder you'll keep for the whole bootcamp:

```powershell
mkdir playground
```

`playground` is where you **experiment**. Each new subject starts there, with small files you change, run, predict and break on purpose, away from the real project. Once a subject makes sense in the playground, the lessons apply it to the spreadsheet itself, the way it's done in real work.

Nothing in `playground` has to be tidy or finished. It's yours.

```check
dir playground -- Type mkdir playground in the terminal and press Enter.
```

## Your turn: find your way with relative paths

Using only `mkdir` and `cd`, make this folder inside your playground:

```text
playground\terminal\deep\deeper
```

Then `cd` into `deeper`, and come back to the project folder with **one** `cd` command. Run `pwd` to see that you're home.

```check
dir playground/terminal/deep/deeper -- Make the folders inside playground.
missing terminal label="nothing was made outside playground" -- A terminal folder is sitting at the top of the project. Remove it (Remove-Item terminal -Recurse) and make it inside playground instead.
```

The checks see the folders, but they can't see where your terminal is. For the second half, `pwd` is your check.

```hints
nudge: `cd` can take a whole path, not only one folder's name. So can `mkdir`.
concept: In PowerShell, `mkdir` makes every missing folder in a path at once: `mkdir a\b\c` makes all three. (On macOS that needs `mkdir -p a/b/c`.) And `..` can be chained in a path: `..\..` means two folders up.
shape: The path from the project folder down to `deeper` has four folder names in it, so the way back up has four `..` in it.
answer: ~~~powershell
mkdir playground\terminal\deep\deeper
cd playground\terminal\deep\deeper
cd ..\..\..\..
pwd
~~~
```
