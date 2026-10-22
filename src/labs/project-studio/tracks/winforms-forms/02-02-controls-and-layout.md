---
title: 2.2 — Build the form one row at a time
runtime: none
reference: optional
---

You can open a window. Now build its layout in four working checkpoints: an empty table, one name input, feedback, then a keyboard path. You will build the quantity row yourself at the end. Keep the terminal in the shared project folder. Run each checkpoint with `dotnet run --project FormDesk/FormDesk.csproj`, observe it, then close the window before checking.

The short snippets explain each edit. The collapsed full-file references are recovery aids; try making the described change before revealing them.

## Put controls in a table

A **control** is an object Windows can display, such as a label or a text box. A `TableLayoutPanel` is a control whose job is arranging other controls. Start with the panel alone. This constructor adds an empty two-column table to the window:

```csharp
TableLayoutPanel layout = new TableLayoutPanel();
layout.Name = "requestLayout";
layout.Dock = DockStyle.Fill;
```

`layout` is a local variable, like a variable inside a Python function. `Name` identifies this control to tests and tooling. `DockStyle.Fill` asks it to fill its parent. A table does not appear merely because it was created: keep `Controls.Add(layout);` at the end to make the form own it.

Set `Padding` to `new Padding(16)`, `ColumnCount` to 2 and `RowCount` to 1. Add these column policies before adding the table to the form:

```csharp
layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
```

The first column will fit a label; the second gets the remaining width. The blank window is expected: a container does not invent its children.

```csharp file=FormDesk/MainForm.cs
namespace FormDesk;

public class MainForm : Form
{
    public MainForm()
    {
        Text = "FormDesk — New request";
        ClientSize = new Size(520, 320);
        MinimumSize = new Size(500, 320);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Name = "requestLayout";
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 1;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        Controls.Add(layout);
    }
}
```

Run it and explain why no input appears yet. In the next checkpoint, we will give the table something to arrange.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- layout-panel" stdout="PASS layout-panel" timeout=120 os=windows label="The form owns a filling two-column table"
```

## Add one remembered input {#name-field}

Add a label and a text box. The label can be local because later behavior will not need it. The input must be remembered after construction, so add a **field** inside the class, above the constructor:

```csharp
private readonly TextBox nameInput = new TextBox();
```

`private` keeps this detail inside MainForm. `readonly` prevents assigning a different TextBox to this field later; it still allows changing that object's `Text`. A Python comparison is storing `self.name_input`, rather than only a temporary local.

Inside the constructor, create `Label nameLabel = new Label();`, set its Text to `"Name"` and AutoSize to `true`. AutoSize lets its size follow the caption. Configure the existing input's Name as `"nameInput"` and Dock as Fill, then put both controls in the table before `Controls.Add(layout);`:

```csharp
layout.Controls.Add(nameLabel, 0, 0);
layout.Controls.Add(nameInput, 1, 0);
```

The numbers mean column, then row; both start at zero.

```predict
question: When the window grows wider, should the name field grow or should its text change?
choice: The field should grow
choice: Its text should change
answer: The field should grow
explain: The second column gets more space and the docked child fills that cell. Layout does not edit the input's data.
```

```csharp file=FormDesk/MainForm.cs
namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();

    public MainForm()
    {
        Text = "FormDesk — New request";
        ClientSize = new Size(520, 320);
        MinimumSize = new Size(500, 320);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Name = "requestLayout";
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 1;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        Label nameLabel = new Label();
        nameLabel.Text = "Name";
        nameLabel.AutoSize = true;
        nameInput.Name = "nameInput";
        nameInput.Dock = DockStyle.Fill;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        Controls.Add(layout);
    }
}
```

Type Ada, widen the window, and compare with your prediction. **Diagnostic experiment:** remove only the input's Dock assignment and rerun. The cell grows while the input keeps a fixed width. Explain why the panel and child each need a layout instruction. Restore Fill and rerun.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- layout-name" stdout="PASS layout-name" timeout=120 os=windows label="The name input fills a growing table cell"
```

## Add quantity and feedback

Leave row 1 empty for your independent quantity row. First add a button in row 2 and a status label in row 3. These are two more controls using the pattern you just practised. Add fields above the constructor:

```csharp
private readonly Button previewButton = new Button();
private readonly Label statusLabel = new Label();
```

Set the button's Name to `"previewButton"`, Text to `"Preview"` and AutoSize to `true`. Set the label's Name to `"statusLabel"`, Text to `"Ready."` and AutoSize to `true`. Change RowCount to 4, then add them to the table:

```csharp
layout.Controls.Add(previewButton, 1, 2);
layout.Controls.Add(statusLabel, 1, 3);
```

A Button does not know what Preview means. Its behavior arrives in lesson 2.3; this checkpoint is about making the controls visible.

```csharp file=FormDesk/MainForm.cs
namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();

    private readonly Button previewButton = new Button();
    private readonly Label statusLabel = new Label();

    public MainForm()
    {
        Text = "FormDesk — New request";
        ClientSize = new Size(520, 320);
        MinimumSize = new Size(500, 320);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Name = "requestLayout";
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 4;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        Label nameLabel = new Label();
        nameLabel.Text = "Name";
        nameLabel.AutoSize = true;
        nameInput.Name = "nameInput";
        nameInput.Dock = DockStyle.Fill;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        previewButton.Name = "previewButton";
        previewButton.Text = "Preview";
        previewButton.AutoSize = true;
        statusLabel.Name = "statusLabel";
        statusLabel.Text = "Ready.";
        statusLabel.AutoSize = true;

        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        Controls.Add(layout);
    }
}
```

Run it. Click Preview once and record what changes. Explain why a caption alone cannot implement an action.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- layout-feedback" stdout="PASS layout-feedback" timeout=120 os=windows label="The preview and status controls occupy their intended rows"
```

## Give the existing controls a keyboard path {#keyboard-path}

`TabIndex` chooses the order in which sibling controls receive Tab focus. `TabStop = false` keeps output labels out of that path. Reserve index 1 for your quantity input; set the name input to 0 and Preview to 2. Give the name label index 0 too, but set its TabStop to false. Do the same TabStop setting for the status label.

An ampersand in a caption marks an access key. Change the label to `"&Name"` and the button to `"&Preview"`. Alt+N should focus the following input; Alt+P should invoke Preview. Set `nameInput.AccessibleName = "Request name";` so accessibility tools have an explicit input name.

```csharp
nameInput.TabIndex = 0;
previewButton.TabIndex = 2;
statusLabel.TabStop = false;
```

The skipped Tab index is harmless. It reserves a place for the quantity row you are about to add.

```csharp file=FormDesk/MainForm.cs
namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();

    private readonly Button previewButton = new Button();
    private readonly Label statusLabel = new Label();

    public MainForm()
    {
        Text = "FormDesk — New request";
        ClientSize = new Size(520, 320);
        MinimumSize = new Size(500, 320);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Name = "requestLayout";
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 4;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        Label nameLabel = new Label();
        nameLabel.Text = "&Name";
        nameLabel.TabIndex = 0;
        nameLabel.TabStop = false;
        nameLabel.AutoSize = true;
        nameInput.Name = "nameInput";
        nameInput.TabIndex = 0;
        nameInput.AccessibleName = "Request name";
        nameInput.Dock = DockStyle.Fill;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        previewButton.Name = "previewButton";
        previewButton.Text = "&Preview";
        previewButton.TabIndex = 2;
        previewButton.AutoSize = true;
        statusLabel.Name = "statusLabel";
        statusLabel.Text = "Ready.";
        statusLabel.AutoSize = true;
        statusLabel.TabStop = false;

        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        Controls.Add(layout);
    }
}
```

Run it and try Tab, Shift+Tab, Alt+N and Alt+P. The check inspects settings; it does not press keys or assess clipping on your screen.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- layout-keyboard" stdout="PASS layout-keyboard" timeout=120 os=windows label="Name and Preview expose their keyboard settings"
```

## Your turn: build the quantity row

Build a quantity row without copying another completed form. A `NumericUpDown` is a number input. Here is an unrelated example showing its three data properties:

```csharp
NumericUpDown minutesInput = new NumericUpDown();
minutesInput.Minimum = 0;
minutesInput.Maximum = 60;
minutesInput.Value = 5;
```

Our quantity must be remembered by later click handlers. Add a **field** named `quantityInput`. Configure Name `"quantityInput"`, range **0 through 1000**, initial Value **1**, TabIndex **1**, and AccessibleName **"Quantity"**. Put it in column 1, row 1. Create an automatically sized `"&Quantity"` label in column 0, row 1; give it TabIndex 1 and TabStop false. The UI range deliberately includes invalid business quantities; chapter 1's Core rules still allow only 1 through 100.

Also add a nonfocusable, automatically sized Label named `helpLabel` in column 1, row 4 with Text **Use Tab to move between fields.** Include this fifth row in RowCount. Choose your own local names for labels.

Before running, predict the Tab sequence. Then run, edit the quantity, and check narrow and wide windows. In your notes retain the observed sequence, explain why a field is needed for quantity but not for its label, and invent one additional input or keyboard test.

```hints
nudge: Work in three places: the field declaration, property assignments inside the constructor, and the layout's Controls.Add calls. Compile after completing each group.
concept: A control's Name and its C# variable name serve different purposes. The table position makes it visible; TabIndex sets keyboard order.
shape: Model the quantity field on nameInput, then apply the number properties from the minutes example. Model both labels on the existing name/status labels. Row positions 0 through 4 require five rows.
```

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- layout-task" stdout="PASS layout-task" timeout=120 os=windows label="The independent quantity row and keyboard hint work together"
```
