---
title: 2.3a — Put validation feedback beside each input
runtime: none
reference: optional
---

One status message can hide a second invalid field. This lesson keeps the preview as a label so you can concentrate on one problem: after a click, every invalid input has its own message, and correcting one input clears only its message. No dialog is involved yet.

## Give the error display a lifetime

An **ErrorProvider** is a component that attaches messages to controls; it is not a layout control. Add this field above the constructor:

```csharp
private readonly ErrorProvider errors = new ErrorProvider();
```

At the start of the constructor set `errors.ContainerControl = this;` and `errors.BlinkStyle = ErrorBlinkStyle.NeverBlink;`. `this` means this MainForm object. The provider needs that container; NeverBlink keeps the icons steady.

Components also own resources. Add the cleanup method shown below after the existing handlers. This is a standard pair of cleanup actions, like a Python cleanup block: release our provider, then let the base Form release its resources.

```csharp
protected override void Dispose(bool disposing)
{
    if (disposing)
    {
        errors.Dispose();
    }
    base.Dispose(disposing);
}
```

`protected` allows derived classes to use a member. `override` supplies our version of Form's existing Dispose method. `base` refers to the Form implementation. Keep the base call; the form still owns its child controls. We add lifetime support now so later error edits only concern behavior.

```csharp file=FormDesk/MainForm.cs
using FormDesk.Core;

namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();
    private readonly NumericUpDown quantityInput = new NumericUpDown();
    private readonly Button previewButton = new Button();
    private readonly Label statusLabel = new Label();

    private readonly ErrorProvider errors = new ErrorProvider();

    public MainForm()
    {
        errors.ContainerControl = this;
        errors.BlinkStyle = ErrorBlinkStyle.NeverBlink;
        Text = "FormDesk — New request";
        ClientSize = new Size(520, 320);
        MinimumSize = new Size(500, 320);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Name = "requestLayout";
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 6;
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

        Button resetButton = new Button();
        resetButton.Name = "resetButton";
        resetButton.Text = "&Reset";
        resetButton.AutoSize = true;
        resetButton.TabIndex = 3;
        resetButton.Click += ResetButton_Click;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        layout.Controls.Add(quantityLabel, 0, 1);
        layout.Controls.Add(quantityInput, 1, 1);
        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        layout.Controls.Add(helpLabel, 1, 4);
        layout.Controls.Add(resetButton, 1, 5);
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
    private void ResetButton_Click(object? sender, EventArgs e)
    {
        nameInput.Text = "";
        quantityInput.Value = 1;
        statusLabel.Text = "Ready.";
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            errors.Dispose();
        }
        base.Dispose(disposing);
    }
}
```

Run once: there should be no icon because no message has been attached. Closing the form also disposes the provider. The check inspects configuration, not resource use over a long-running session.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- error-provider" stdout="PASS error-provider" timeout=120 os=windows label="The nonblinking ErrorProvider belongs to the form"
```

## Work through the name field once

After reading name and quantity, but before calling Validate, add:

```csharp
string nameError = RequestRules.NameError(name);
errors.SetError(nameInput, nameError);
```

SetError associates a message with one control. An empty message removes that control's old error. Keep the existing combined Validate gate for now, so quantity errors still stop the preview.

```predict
question: Submit a blank name, then correct it and submit again. What should the second SetError receive?
choice: An empty string
choice: The old error text
answer: An empty string
explain: NameError runs again on the current text. An empty string clears that input's previous message.
```

```csharp file=FormDesk/MainForm.cs
using FormDesk.Core;

namespace FormDesk;

public class MainForm : Form
{
    private readonly TextBox nameInput = new TextBox();
    private readonly NumericUpDown quantityInput = new NumericUpDown();
    private readonly Button previewButton = new Button();
    private readonly Label statusLabel = new Label();

    private readonly ErrorProvider errors = new ErrorProvider();

    public MainForm()
    {
        errors.ContainerControl = this;
        errors.BlinkStyle = ErrorBlinkStyle.NeverBlink;
        Text = "FormDesk — New request";
        ClientSize = new Size(520, 320);
        MinimumSize = new Size(500, 320);

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Name = "requestLayout";
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 6;
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

        Button resetButton = new Button();
        resetButton.Name = "resetButton";
        resetButton.Text = "&Reset";
        resetButton.AutoSize = true;
        resetButton.TabIndex = 3;
        resetButton.Click += ResetButton_Click;

        layout.Controls.Add(nameLabel, 0, 0);
        layout.Controls.Add(nameInput, 1, 0);
        layout.Controls.Add(quantityLabel, 0, 1);
        layout.Controls.Add(quantityInput, 1, 1);
        layout.Controls.Add(previewButton, 1, 2);
        layout.Controls.Add(statusLabel, 1, 3);
        layout.Controls.Add(helpLabel, 1, 4);
        layout.Controls.Add(resetButton, 1, 5);
        Controls.Add(layout);
    }
    private void PreviewButton_Click(object? sender, EventArgs e)
    {
        string name = nameInput.Text.Trim();
        int quantity = (int)quantityInput.Value;
        string nameError = RequestRules.NameError(name);
        errors.SetError(nameInput, nameError);
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
    private void ResetButton_Click(object? sender, EventArgs e)
    {
        nameInput.Text = "";
        quantityInput.Value = 1;
        statusLabel.Text = "Ready.";
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            errors.Dispose();
        }
        base.Dispose(disposing);
    }
}
```

Run with whitespace / 2, hover the name icon, then correct the name and retry. **Diagnostic experiment:** temporarily replace `errors.SetError(nameInput, nameError);` with `errors.SetError(nameInput, "Enter a name.");`. The icon survives a correction even though the rule passes. Restore the variable and explain why stale UI feedback is separate from a correct rule.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- name-error" stdout="PASS name-error" timeout=120 os=windows label="The name message appears and clears through real button events"
```

## Your turn: show both errors and guard success

Implement per-field validation yourself. Replace the combined Validate call and its first-error gate with a result for **each** field. Use RequestRules.QuantityError for quantity, attach its message to quantityInput, and keep the name's independent message. If **either** message is nonempty, show **Fix the marked fields.** and stop the handler before building a successful preview. C# uses `||` for Python's `or`.

Both SetError calls must run on every attempt, even if the first field is invalid. When both fields are valid, keep the existing **Preview: name × quantity** behavior. Do not disable the rule or narrow NumericUpDown's range to hide invalid cases.

Test this sequence: whitespace / 0 → Ada / 0 → Ada / 2. Expect two icons → only the quantity icon → no icons and the preview. Also test only a bad name with quantity 2 and only a bad quantity with a good name; neither may reach success. Record the observations, explain why `&&` would allow a single bad field through, and design one extra boundary sequence of your own.

```hints
nudge: First produce two messages, then update two controls, then make one decision. Returning before the second SetError would hide an error.
concept: A form's error display and its success gate must use the same freshly computed messages. Either invalid field means stop, so combine the nonempty comparisons with ||.
shape: Keep nameError, add quantityError, call SetError for each input, then put the status assignment and return inside one if. Leave the valid draft creation below that block.
```

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- field-task" stdout="PASS field-task" timeout=120 os=windows label="Independent field validation handles both, either, corrected and valid inputs"
```
