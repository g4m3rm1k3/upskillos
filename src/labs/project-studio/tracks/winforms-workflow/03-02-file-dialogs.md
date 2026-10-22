---
title: 3.2 — File Dialogs, Cancel and Preserved State
runtime: none
reference: optional
support: WorkflowUiChecks/WorkflowUiChecks.csproj, WorkflowUiChecks/Program.cs
---

Connect the tested file helper to the existing form. An Open operation has two phases: obtain and validate a candidate, then apply it. The current fields should survive Cancel, invalid JSON and invalid values. Continue after 3.1; close FormDesk before building.

## Add save and open actions

The reference below keeps the existing layout and adds two buttons after Reset. Compare its diff in small passes: first button construction, then SaveButton_Click, then OpenButton_Click and ApplyDraft. Keep the earlier preview and reset behavior.

`SaveFileDialog` asks the user for a destination; `OpenFileDialog` asks for an existing source. A filter helps selection, but is not validation. `FileName` is read only after `ShowDialog(this)` returns OK. Cancel takes an early return and changes nothing. The using declarations dispose both dialogs.

Save checks the values before asking for a path and the helper validates again before writing. AddExtension supplies the .json suffix; OverwritePrompt asks before replacing an existing file. Open calls Load **before** touching a control. Each catch names an expected failure; unexpected programming errors remain visible during debugging. The status text reports success only after the operation completes.

```csharp file=FormDesk/MainForm.cs
using System.Text.Json;
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
        layout.RowCount = 8;
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
        Button saveButton = new Button();
        saveButton.Name = "saveButton";
        saveButton.Text = "&Save draft";
        saveButton.AutoSize = true;
        saveButton.TabIndex = 4;
        saveButton.Click += SaveButton_Click;
        Button openButton = new Button();
        openButton.Name = "openButton";
        openButton.Text = "&Open draft";
        openButton.AutoSize = true;
        openButton.TabIndex = 5;
        openButton.Click += OpenButton_Click;
        layout.Controls.Add(saveButton, 1, 6);
        layout.Controls.Add(openButton, 1, 7);
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
        using RequestPreviewForm dialog = new RequestPreviewForm(draft);
        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            statusLabel.Text = $"Confirmed: {draft.Name} × {draft.Quantity}";
        }
        else
        {
            statusLabel.Text = "Preview cancelled.";
        }
    }
    private void ResetButton_Click(object? sender, EventArgs e)
    {
        errors.Clear();
        nameInput.Text = "";
        quantityInput.Value = 1;
        statusLabel.Text = "Ready.";
    }
    private void SaveButton_Click(object? sender, EventArgs e)
    {
        RequestDraft draft = new RequestDraft();
        draft.Name = nameInput.Text;
        draft.Quantity = (int)quantityInput.Value;
        string error = RequestRules.Validate(draft.Name, draft.Quantity);
        if (error != "")
        {
            statusLabel.Text = error;
            return;
        }
        using SaveFileDialog dialog = new SaveFileDialog();
        dialog.Filter = "JSON drafts (*.json)|*.json";
        dialog.DefaultExt = "json";
        dialog.AddExtension = true;
        dialog.OverwritePrompt = true;
        if (dialog.ShowDialog(this) != DialogResult.OK) return;
        try
        {
            DraftFiles.Save(dialog.FileName, draft);
            statusLabel.Text = "Saved draft.";
        }
        catch (InvalidDataException failure) { statusLabel.Text = failure.Message; }
        catch (IOException failure) { statusLabel.Text = "Could not save: " + failure.Message; }
        catch (UnauthorizedAccessException failure) { statusLabel.Text = "Could not save: " + failure.Message; }
    }

    private void OpenButton_Click(object? sender, EventArgs e)
    {
        using OpenFileDialog dialog = new OpenFileDialog();
        dialog.Filter = "JSON drafts (*.json)|*.json";
        if (dialog.ShowDialog(this) != DialogResult.OK) return;
        try
        {
            RequestDraft loaded = DraftFiles.Load(dialog.FileName);
            ApplyDraft(loaded);
        }
        catch (InvalidDataException failure) { statusLabel.Text = failure.Message; }
        catch (JsonException) { statusLabel.Text = "Could not open: invalid JSON."; }
        catch (IOException failure) { statusLabel.Text = "Could not open: " + failure.Message; }
        catch (UnauthorizedAccessException failure) { statusLabel.Text = "Could not open: " + failure.Message; }
    }

    public void ApplyDraft(RequestDraft draft)
    {
        nameInput.Text = draft.Name;
        quantityInput.Value = draft.Quantity;
        errors.Clear();
        statusLabel.Text = "Opened draft.";
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

`ApplyDraft` copies an already validated object into the controls. It is public so a separate check program can call it; unlike the event handlers, it has no dialog interaction. It clears stale errors only after a successful load. In the independent task you will strengthen its contract for future callers.

Run `dotnet run --project FormDesk`. Enter Fixture and 3, Save draft, choose a new file, and inspect its JSON. Change the fields, Open the file, and verify both values return. Repeat with Cancel in each dialog. Cancel must preserve fields and status. Close the window before checking.

```predict
question: If Load throws for a bad file, has ApplyDraft already changed the fields?
choice: No, Load must finish first
choice: Yes, opening always clears them
answer: No, Load must finish first
explain: The call to ApplyDraft is after Load returns. An exception jumps to catch before reaching that call.
```

For a diagnostic experiment, save a COPY of your good file, change Quantity to 101 in that copy, and try to open it. The form should explain the allowed range and keep the current name and quantity. Restore the copy to 3 and open successfully. Never use your only copy for an experiment.

```check
run "dotnet build FormDesk/FormDesk.csproj --nologo" stdout="Build succeeded." timeout=120 os=windows label="The file-dialog handlers compile with the existing form"
```

This check establishes compilation, not successful file selection, cancellation, keyboard navigation or permission handling. The preceding real-window experiment is necessary evidence. Resize the window and confirm both new buttons remain reachable; at higher display scaling, make the window taller if needed.

## Inspect the state-transfer checks

Create the provided note and its support files. The Windows check constructs controls without showing the form. It checks names, button positions and copying a valid draft; it does not open system dialogs.

```text file=workflow-ui-guide.txt provided
Run dotnet run --project WorkflowUiChecks -- controls
The checks inspect a constructed form. File dialogs and rendering require the manual exercise.
```

```check
run "dotnet run --project WorkflowUiChecks -- controls" stdout="workflow controls: passed" timeout=120 os=windows label="Open/save controls exist and a valid draft transfers to the fields"
```

## Your turn: protect the receiving method

Another C# caller could eventually call ApplyDraft without going through Load. Add validation to **the beginning** of ApplyDraft. If the draft violates RequestRules, throw InvalidDataException before changing any control. A valid draft should still update both fields, clear errors and report Opened draft.

Test whitespace-only Name and quantities 0 and 101. Each must leave the old fields intact. Design one valid boundary draft yourself. Explain why placing the guard after the first assignment can corrupt the displayed data even when the method ultimately throws.

```hints
nudge: The existing Save helper demonstrates the guard you need; its position is as important as its condition.
concept: Validate returns an empty string only for an accepted name and quantity. Throw before writing either property.
shape: At the top of ApplyDraft, store Validate's result; if it is nonempty, throw InvalidDataException with that message.
```

```check
run "dotnet run --project WorkflowUiChecks -- guard" stdout="workflow guard: passed" timeout=120 os=windows label="Invalid drafts cannot partially replace current fields"
```

The check verifies invalid inputs and state preservation through the public method. It does not verify native dialog clicks or filesystem permission behavior. Retain your actual cancel/failure observations and explain which layer rejected each failure.

