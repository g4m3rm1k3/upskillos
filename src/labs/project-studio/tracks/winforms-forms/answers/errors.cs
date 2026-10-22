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
        DialogResult result = ShowPreview(draft);
        if (result == DialogResult.OK)
        {
            statusLabel.Text = $"Confirmed: {draft.Name} × {draft.Quantity}";
        }
        else
        {
            statusLabel.Text = "Preview cancelled.";
        }
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
