---
title: 2.3 — A click, current values, then a validation gate
runtime: none
reference: optional
---

The layout is complete. Build the behavior in three small experiments: prove a click reaches a method, read the controls, then stop invalid input. Only after that will you implement Reset yourself. Run each checkpoint with `dotnet run --project FormDesk/FormDesk.csproj` and close the window before checking.

## Subscribe a method to a click

An **event** is a notification. Inside the constructor, after configuring Preview, add:

```csharp
previewButton.Click += PreviewButton_Click;
```

`+=` subscribes a method. Pass its name without parentheses so Windows calls it on a future click. Add this method inside MainForm, after the constructor:

```csharp
private void PreviewButton_Click(object? sender, EventArgs e)
{
    statusLabel.Text = "Preview clicked.";
}
```

`void` means no returned value. `object?` permits a missing sender; this `?` is a nullable annotation. `EventArgs` carries event information. Windows supplies these two arguments. We do not need their values yet.

```predict
question: If you delete only the Click subscription, does clicking Preview still run the method?
choice: No
choice: Yes
answer: No
explain: Naming a method does not connect it to a button. The event subscription makes that connection.
```

```csharp file=FormDesk/MainForm.cs
namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();
    private readonly NumericUpDown quantityInput = new NumericUpDown();
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
        layout.RowCount = 5;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        Label nameLabel = new Label();
        nameLabel.Text = "&Name";
        nameLabel.AutoSize = true;
        nameLabel.TabIndex = 0;
        nameLabel.TabStop = false;
        nameInput.Name = "nameInput";
        nameInput.Dock = DockStyle.Fill;
        nameInput.TabIndex = 0;
        nameInput.AccessibleName = "Request name";

        Label quantityLabel = new Label();
        quantityLabel.Text = "&Quantity";
        quantityLabel.AutoSize = true;
        quantityLabel.TabIndex = 1;
        quantityLabel.TabStop = false;
        quantityInput.Name = "quantityInput";
        quantityInput.Minimum = 0;
        quantityInput.Maximum = 1000;
        quantityInput.Value = 1;
        quantityInput.TabIndex = 1;
        quantityInput.AccessibleName = "Quantity";

        previewButton.Name = "previewButton";
        previewButton.Text = "&Preview";
        previewButton.AutoSize = true;
        previewButton.TabIndex = 2;
        previewButton.Click += PreviewButton_Click;

        statusLabel.Name = "statusLabel";
        statusLabel.Text = "Ready.";
        statusLabel.AutoSize = true;
        statusLabel.TabStop = false;

        Label helpLabel = new Label();
        helpLabel.Name = "helpLabel";
        helpLabel.Text = "Use Tab to move between fields.";
        helpLabel.AutoSize = true;
        helpLabel.TabStop = false;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        layout.Controls.Add(quantityLabel, 0, 1);
        layout.Controls.Add(quantityInput, 1, 1);
        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        layout.Controls.Add(helpLabel, 1, 4);
        Controls.Add(layout);
    }
    private void PreviewButton_Click(object? sender, EventArgs e)
    {
        statusLabel.Text = "Preview clicked.";
    }
}
```

Run and click Preview. Then perform the predicted diagnostic: remove only the subscription, rerun, and observe that Ready. stays unchanged. The compiler accepts an unused method. Restore the subscription and retest. Explain the difference between constructing a Button and connecting its behavior.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- click" stdout="PASS click" timeout=120 os=windows label="A real Click event reaches the status-changing handler"
```

## Read the values that exist now {#read-current-values}

Replace the handler's constant message with these three lines:

```csharp
string name = nameInput.Text.Trim();
int quantity = (int)quantityInput.Value;
statusLabel.Text = $"Preview: {name} × {quantity}";
```

`Trim()` removes surrounding whitespace and returns new text. NumericUpDown.Value is a `decimal`; `(int)` explicitly converts it to the whole-number quantity used by Core. Keep DecimalPlaces at its default zero. `$"...{name}..."` inserts values into text like a Python f-string.

```predict
question: Enter two spaces, Ada, two spaces and quantity 2. What status should appear?
choice: Preview: Ada × 2
choice: Preview:   Ada   × 2
answer: Preview: Ada × 2
explain: Trim removes outside whitespace before interpolation. Reading inside the handler means each click reads the current controls.
```

```csharp file=FormDesk/MainForm.cs
namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();
    private readonly NumericUpDown quantityInput = new NumericUpDown();
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
        layout.RowCount = 5;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        Label nameLabel = new Label();
        nameLabel.Text = "&Name";
        nameLabel.AutoSize = true;
        nameLabel.TabIndex = 0;
        nameLabel.TabStop = false;
        nameInput.Name = "nameInput";
        nameInput.Dock = DockStyle.Fill;
        nameInput.TabIndex = 0;
        nameInput.AccessibleName = "Request name";

        Label quantityLabel = new Label();
        quantityLabel.Text = "&Quantity";
        quantityLabel.AutoSize = true;
        quantityLabel.TabIndex = 1;
        quantityLabel.TabStop = false;
        quantityInput.Name = "quantityInput";
        quantityInput.Minimum = 0;
        quantityInput.Maximum = 1000;
        quantityInput.Value = 1;
        quantityInput.TabIndex = 1;
        quantityInput.AccessibleName = "Quantity";

        previewButton.Name = "previewButton";
        previewButton.Text = "&Preview";
        previewButton.AutoSize = true;
        previewButton.TabIndex = 2;
        previewButton.Click += PreviewButton_Click;

        statusLabel.Name = "statusLabel";
        statusLabel.Text = "Ready.";
        statusLabel.AutoSize = true;
        statusLabel.TabStop = false;

        Label helpLabel = new Label();
        helpLabel.Name = "helpLabel";
        helpLabel.Text = "Use Tab to move between fields.";
        helpLabel.AutoSize = true;
        helpLabel.TabStop = false;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        layout.Controls.Add(quantityLabel, 0, 1);
        layout.Controls.Add(quantityInput, 1, 1);
        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        layout.Controls.Add(helpLabel, 1, 4);
        Controls.Add(layout);
    }
    private void PreviewButton_Click(object? sender, EventArgs e)
    {
        string name = nameInput.Text.Trim();
        int quantity = (int)quantityInput.Value;
        statusLabel.Text = $"Preview: {name} × {quantity}";
    }
}
```

Run twice: Ada / 2, then Grace / 3 without closing the window. The second message must show the new data. Try whitespace / 0 and explain why it is currently displayed: reading data and validating it are different operations.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- values" stdout="PASS values" timeout=120 os=windows label="Each click reads and normalizes the latest control values"
```

## Stop before invalid data is previewed {#validation-gate}

Import `FormDesk.Core` at the top with `using FormDesk.Core;`. Between reading the values and displaying the preview, call the existing rule:

```csharp
string error = RequestRules.Validate(name, quantity);
if (error != "")
{
    statusLabel.Text = error;
    return;
}
```

The early `return;` ends this click handler. It does not close the form. On the valid path create a RequestDraft, assign its Name and Quantity, and interpolate those properties in the preview message, as you practised in chapter 1. You now pass a small data object rather than carrying controls into Core.

```csharp file=FormDesk/MainForm.cs
using FormDesk.Core;

namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();
    private readonly NumericUpDown quantityInput = new NumericUpDown();
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
        layout.RowCount = 5;
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        Label nameLabel = new Label();
        nameLabel.Text = "&Name";
        nameLabel.AutoSize = true;
        nameLabel.TabIndex = 0;
        nameLabel.TabStop = false;
        nameInput.Name = "nameInput";
        nameInput.Dock = DockStyle.Fill;
        nameInput.TabIndex = 0;
        nameInput.AccessibleName = "Request name";

        Label quantityLabel = new Label();
        quantityLabel.Text = "&Quantity";
        quantityLabel.AutoSize = true;
        quantityLabel.TabIndex = 1;
        quantityLabel.TabStop = false;
        quantityInput.Name = "quantityInput";
        quantityInput.Minimum = 0;
        quantityInput.Maximum = 1000;
        quantityInput.Value = 1;
        quantityInput.TabIndex = 1;
        quantityInput.AccessibleName = "Quantity";

        previewButton.Name = "previewButton";
        previewButton.Text = "&Preview";
        previewButton.AutoSize = true;
        previewButton.TabIndex = 2;
        previewButton.Click += PreviewButton_Click;

        statusLabel.Name = "statusLabel";
        statusLabel.Text = "Ready.";
        statusLabel.AutoSize = true;
        statusLabel.TabStop = false;

        Label helpLabel = new Label();
        helpLabel.Name = "helpLabel";
        helpLabel.Text = "Use Tab to move between fields.";
        helpLabel.AutoSize = true;
        helpLabel.TabStop = false;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        layout.Controls.Add(quantityLabel, 0, 1);
        layout.Controls.Add(quantityInput, 1, 1);
        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        layout.Controls.Add(helpLabel, 1, 4);
        Controls.Add(layout);
    }
    private void PreviewButton_Click(object? sender, EventArgs e)
    {
        string name = nameInput.Text.Trim();
        int quantity = (int)quantityInput.Value;
        string error = RequestRules.Validate(name, quantity);
        if (error != "")
        {
            statusLabel.Text = error;
            return;
        }

        RequestDraft draft = new RequestDraft();
        draft.Name = name;
        draft.Quantity = quantity;
        statusLabel.Text = $"Preview: {draft.Name} × {draft.Quantity}";
    }
}
```

Run Ada / 2, whitespace / 2, Ada / 0, then Ada / 100. **Diagnostic experiment:** remove only `return;`. The error is assigned, then overwritten by a success message. Restore the return and explain which later lines it protects. The automated check raises actual hidden-button events; it does not physically click or test focus.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- events" stdout="PASS events" timeout=120 os=windows label="Current values pass the shared rule before becoming a preview"
```

## Your turn: reset a draft

Add a Button named `resetButton`, with text **&Reset**, AutoSize enabled and TabIndex 3. Put it in column 1, row 5; add a sixth row. Subscribe a new handler that clears the name, restores quantity **1**, and sets the status to **Ready.**.

Test Preview with **Ada / 2**, then Reset. Test a validation error, then Reset. In your notes record the observed state, explain why resetting only the status would leave old data behind, and design one additional reset sequence.

```hints
nudge: Build a second Button using the same three stages: create it, add it to the layout, connect its Click.
concept: A handler can assign control properties as well as read them. The method's event signature is the same as Preview's.
shape: Add a ResetButton_Click method with object? sender and EventArgs e. Its body assigns nameInput.Text, quantityInput.Value and statusLabel.Text to the three requested defaults.
```

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- events-task" stdout="PASS events-task" timeout=120 os=windows label="Independent Reset behavior restores data after success and failure"
```
