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

        Button cancelButton = new Button();
        cancelButton.Name = "cancelButton";
        cancelButton.Text = "&Cancel";
        cancelButton.AutoSize = true;
        cancelButton.DialogResult = DialogResult.Cancel;

        layout.Controls.Add(confirmButton, 0, 1);
        layout.Controls.Add(cancelButton, 1, 1);
        Controls.Add(layout);
        AcceptButton = confirmButton;
        CancelButton = cancelButton;
    }
}
