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
}
