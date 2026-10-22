---
title: 2.4 — Ask for confirmation and respect cancellation
runtime: none
reference: optional
---

Continue after 2.3a: both fields already have independent error messages and a tested success gate. This lesson adds a preview in small checkpoints: clean up feedback on Reset, display a draft in a second form, configure its outcomes, then open it. You will implement the caller's decision yourself. Confirmation still does not save anything.

## Attach errors to the fields that need attention

Check your starting state before adding another window: whitespace / 0 marks both inputs; correcting only the name clears only that message. If it does not, return to 2.3a's independent task.

Reset currently changes data but can leave old icons. Add just one line at the start of ResetButton_Click:

```csharp
errors.Clear();
```

Clear removes displayed messages, not validation rules. Run a failure → Reset → Preview sequence. Reset removes icons; Preview must mark the still-empty name again. Explain why clearing an error display cannot make data valid.

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
        string quantityError = RequestRules.QuantityError(quantity);
        errors.SetError(nameInput, nameError);
        errors.SetError(quantityInput, quantityError);
        if (nameError != "" || quantityError != "")
        {
            statusLabel.Text = "Fix the marked fields.";
            return;
        }

        RequestDraft draft = new RequestDraft();
        draft.Name = name;
        draft.Quantity = quantity;
        statusLabel.Text = $"Preview: {draft.Name} × {draft.Quantity}";
    }
    private void ResetButton_Click(object? sender, EventArgs e)
    {
        errors.Clear();
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

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- errors-task" stdout="PASS errors-task" timeout=120 os=windows label="Reset clears feedback and the next click still validates"
```

## Display a draft in a second form {#preview-summary}

Create a second file, `FormDesk/RequestPreviewForm.cs`. Its constructor receives a RequestDraft; it does not reach into MainForm's controls. Use the familiar table and Label pattern to display `$"{draft.Name} × {draft.Quantity}"`. Name the label `summaryLabel`. The complete reference is short because this form contains only the summary.

`StartPosition = FormStartPosition.CenterParent;` asks to center over an owner when one is supplied. This checkpoint only constructs the second form in memory; the main form still previews in its status label.

```csharp file=FormDesk/RequestPreviewForm.cs
using FormDesk.Core;

namespace FormDesk;

public class RequestPreviewForm : Form
{
    public RequestPreviewForm(RequestDraft draft)
    {
        Text = "Preview request";
        ClientSize = new Size(360, 180);
        StartPosition = FormStartPosition.CenterParent;

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 2;

        Label summaryLabel = new Label();
        summaryLabel.Name = "summaryLabel";
        summaryLabel.Text = $"{draft.Name} × {draft.Quantity}";
        summaryLabel.AutoSize = true;
        layout.Controls.Add(summaryLabel, 0, 0);
        layout.SetColumnSpan(summaryLabel, 2);

        Controls.Add(layout);
    }
}
```

Predict which text a draft with Name Ada and Quantity 2 produces, then run the check and explain where the two values come from. The check constructs the form and reads its label; it does not show it.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- dialog-summary" stdout="PASS dialog-summary" timeout=120 os=windows label="The second form renders the draft it receives"
```

## Build a preview that has two outcomes

A **DialogResult** is a named outcome such as OK or Cancel. Start with the confirming button. In the preview constructor create a Button named `confirmButton`, Text `"&Confirm"`, and AutoSize true. Set its result and place it in the table:

```csharp
confirmButton.DialogResult = DialogResult.OK;
layout.Controls.Add(confirmButton, 0, 1);
AcceptButton = confirmButton;
```

Setting AcceptButton tells the form which button Enter should activate. A result is data the caller will receive; OK does not save or approve anything by itself.

```csharp file=FormDesk/RequestPreviewForm.cs
using FormDesk.Core;

namespace FormDesk;

public class RequestPreviewForm : Form
{
    public RequestPreviewForm(RequestDraft draft)
    {
        Text = "Preview request";
        ClientSize = new Size(360, 180);
        StartPosition = FormStartPosition.CenterParent;

        TableLayoutPanel layout = new TableLayoutPanel();
        layout.Dock = DockStyle.Fill;
        layout.Padding = new Padding(16);
        layout.ColumnCount = 2;
        layout.RowCount = 2;

        Label summaryLabel = new Label();
        summaryLabel.Name = "summaryLabel";
        summaryLabel.Text = $"{draft.Name} × {draft.Quantity}";
        summaryLabel.AutoSize = true;
        layout.Controls.Add(summaryLabel, 0, 0);
        layout.SetColumnSpan(summaryLabel, 2);

        Button confirmButton = new Button();
        confirmButton.Name = "confirmButton";
        confirmButton.Text = "&Confirm";
        confirmButton.AutoSize = true;
        confirmButton.DialogResult = DialogResult.OK;

        layout.Controls.Add(confirmButton, 0, 1);
        Controls.Add(layout);
        AcceptButton = confirmButton;
    }
}
```

In the next checkpoint you will add the other outcome yourself. The check inspects the actual button and AcceptButton assignment; keyboard interaction still needs the manual run later.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- dialog-confirm" stdout="PASS dialog-confirm" timeout=120 os=windows label="Confirmation has an OK result and the Enter binding"
```

## Your turn: give the preview a safe exit {#cancel-button-task}

Add the second button in RequestPreviewForm yourself. Name it `cancelButton`, give it Text **&Cancel**, enable AutoSize, and put it at column 1, row 1. It must return **DialogResult.Cancel** and be the form's **CancelButton**, so Escape is a cancellation. Keep confirmation intact.

Predict whether clicking Cancel should produce OK or Cancel and explain why the caller must distinguish them. You will manually test Escape and the title-bar X once the next step opens the preview.

```hints
nudge: Follow the confirming button's construction and placement, but choose the other outcome and keyboard property.
concept: A button's DialogResult determines its outcome. The form's CancelButton determines which button Escape activates.
shape: Create, name, caption, size and place a second Button. Assign its Cancel result, then assign that button to the form's CancelButton property.
```

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- dialog" stdout="PASS dialog" timeout=120 os=windows label="Independent Cancel wiring preserves separate OK and Cancel outcomes"
```

## Open the preview only after validation

A **modal dialog** is a window that makes its caller wait for an outcome. Put the actual opening in a small named method inside MainForm:

```csharp
protected virtual DialogResult ShowPreview(RequestDraft draft)
{
    using RequestPreviewForm dialog = new RequestPreviewForm(draft);
    return dialog.ShowDialog(this);
}
```

`ShowDialog(this)` opens it with MainForm as owner. `using` here is a cleanup declaration, different from the namespace import: dispose the dialog when this method ends. Its returned value is the outcome. `protected virtual` lets a derived form replace only this window-opening operation. The supplied checker does that to return a pretend outcome and count calls without opening windows; your ordinary MainForm uses ShowDialog.

In PreviewButton_Click, keep the entire field-error gate and draft construction. Replace only its final status assignment with:

```csharp
ShowPreview(draft);
statusLabel.Text = "Preview closed.";
```

For this checkpoint both buttons deliberately produce the same status; you will distinguish their returned outcomes next.

```predict
question: With a good name but quantity zero, how many times should ShowPreview run?
choice: 0
choice: 1
answer: 0
explain: Either field error returns from the handler before constructing or showing a preview.
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
        string quantityError = RequestRules.QuantityError(quantity);
        errors.SetError(nameInput, nameError);
        errors.SetError(quantityInput, quantityError);
        if (nameError != "" || quantityError != "")
        {
            statusLabel.Text = "Fix the marked fields.";
            return;
        }

        RequestDraft draft = new RequestDraft();
        draft.Name = name;
        draft.Quantity = quantity;
        ShowPreview(draft);
        statusLabel.Text = "Preview closed.";
    }
    protected virtual DialogResult ShowPreview(RequestDraft draft)
    {
        using RequestPreviewForm dialog = new RequestPreviewForm(draft);
        return dialog.ShowDialog(this);
    }
    private void ResetButton_Click(object? sender, EventArgs e)
    {
        errors.Clear();
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

Run `dotnet run --project FormDesk/FormDesk.csproj`. Try Ada / 0: no preview may open. Then Ada / 2: inspect the summary, Cancel, reopen and Confirm. The owner should wait while the preview is open; both outcomes currently say Preview closed. **Diagnostic experiment:** replace `return dialog.ShowDialog(this);` with `return DialogResult.Cancel;`, run a valid request and observe that no window appears. Restore ShowDialog. Explain the difference between returning an outcome and performing the modal interaction.

The check replaces the opening method: it proves that valid data reaches it and invalid cases stop first. It does not establish actual ownership, focus, modal keyboard behavior or appearance.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- dialog-open" stdout="PASS dialog-open" timeout=120 os=windows label="Only valid current drafts reach the window-opening method"
```

## Your turn: handle the outcome instead of assuming success

Implement the caller's decision without a supplied handler. Store the DialogResult returned by ShowPreview. Only **OK** may set status to **Confirmed: name × quantity**, using the normalized draft. Every other result must set **Preview cancelled.** Keep the field-error gate, both field messages, Reset cleanup, and existing defaults.

The earlier comparison and if/else lessons supply the syntax. Decide where the returned value belongs and which comparison allows confirmation. Do not compare a control's caption or infer acceptance merely because the window closed.

Run Ada / 2 → Cancel, then Confirm. Repeat with Escape, Enter and the title-bar X. Cancellation must never say Confirmed. **Diagnostic experiment after your solution:** temporarily compare with Cancel instead of OK, observe the wrong result, and restore OK. Record an outcome, explain the failed comparison, and invent one more sequence mixing a field correction, cancellation and Reset.

```hints
nudge: The method returns a value just like RequestRules.Validate does. Calling it without storing that value discards the information you need.
concept: Compare the returned DialogResult to DialogResult.OK with ==. Everything outside that one accepted outcome belongs in the cancellation branch.
shape: After creating the draft, assign the method's result to a local DialogResult. Use if/else to choose the two status strings; interpolate draft.Name and draft.Quantity only in the OK branch.
```

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- dialog-task" stdout="PASS dialog-task" timeout=120 os=windows label="Independent outcome handling accepts only OK and preserves the validation gate"
```
