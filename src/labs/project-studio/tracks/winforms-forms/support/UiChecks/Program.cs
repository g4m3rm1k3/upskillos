using System.Reflection;
using FormDesk;
using FormDesk.Core;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            ApplicationConfiguration.Initialize();
            using MainForm form = new MainForm();
            string mode = args[0];
            switch (mode)
            {
                case "window":
                    Require(form.Text == "FormDesk", "Window title should be FormDesk.");
                    Require(form.ClientSize.Width >= 480 && form.ClientSize.Height >= 280, "Set a usable client size.");
                    break;
                case "window-task":
                    Require(form.Text == "FormDesk — New request", "Use the new-request title.");
                    Require(form.MinimumSize.Width >= 500 && form.MinimumSize.Height >= 320, "Set a 500 by 320 minimum size.");
                    break;
                case "layout-name":
                    CheckNameLayout(form);
                    break;
                case "layout":
                    CheckLayout(form);
                    break;
                case "layout-task":
                    Label help = Find<Label>(form, "helpLabel");
                    Require(help.Text == "Use Tab to move between fields.", "Explain the keyboard path.");
                    Require(help.AutoSize && !help.TabStop, "Help should grow with its text and stay out of Tab order.");
                    Require(help.Parent is TableLayoutPanel helpLayout && helpLayout.GetColumn(help) == 1 && helpLayout.GetRow(help) == 4 && helpLayout.RowCount >= 5, "Put the help below the status in a fifth row.");
                    break;
                case "events":
                    CheckPreview(form);
                    break;
                case "events-task":
                    CheckPreview(form);
                    Click(Find<Button>(form, "resetButton"));
                    Require(Find<TextBox>(form, "nameInput").Text == "", "Reset must clear the name.");
                    Require(Find<NumericUpDown>(form, "quantityInput").Value == 1, "Reset must restore quantity 1.");
                    Require(Find<Label>(form, "statusLabel").Text == "Ready.", "Reset must restore Ready.");
                    break;
                case "errors":
                    CheckErrors(form);
                    break;
                case "dialog":
                    CheckDialog();
                    break;
                case "errors-task":
                    CheckErrors(form);
                    Find<TextBox>(form, "nameInput").Text = " ";
                    Click(Find<Button>(form, "previewButton"));
                    Click(Find<Button>(form, "resetButton"));
                    ErrorProvider errors = Errors(form);
                    Require(errors.GetError(Find<TextBox>(form, "nameInput")) == "", "Reset must remove the name error.");
                    Require(errors.GetError(Find<NumericUpDown>(form, "quantityInput")) == "", "Reset must remove the quantity error.");
                    Require(Find<TextBox>(form, "nameInput").Text == "" && Find<NumericUpDown>(form, "quantityInput").Value == 1, "Reset must restore both data defaults.");
                    Require(Find<Label>(form, "statusLabel").Text == "Ready.", "Reset must restore Ready.");
                    break;
                default:
                    throw new InvalidOperationException("Unknown check: " + mode);
            }
            Console.WriteLine("PASS " + mode);
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL " + error.Message);
            return 1;
        }
    }

    private static T Find<T>(Control parent, string name) where T : Control
    {
        Control[] found = parent.Controls.Find(name, true);
        Require(found.Length == 1 && found[0] is T, "Expected one " + name + ".");
        return (T)found[0];
    }

    private static void CheckNameLayout(Form form)
    {
        TableLayoutPanel layout = Find<TableLayoutPanel>(form, "requestLayout");
        TextBox name = Find<TextBox>(form, "nameInput");
        Require(layout.Dock == DockStyle.Fill && layout.ColumnCount == 2, "Use a two-column filling layout.");
        Require(layout.GetColumn(name) == 1 && layout.GetRow(name) == 0, "Name input belongs beside Name.");
        Require(name.Dock == DockStyle.Fill, "Name should fill its cell.");
        int original = name.Width;
        form.ClientSize = new System.Drawing.Size(form.ClientSize.Width + 160, form.ClientSize.Height);
        form.PerformLayout();
        layout.PerformLayout();
        Require(name.Width > original, "The name field should grow when the form grows.");
    }

    private static void CheckLayout(Form form)
    {
        TableLayoutPanel layout = Find<TableLayoutPanel>(form, "requestLayout");
        TextBox name = Find<TextBox>(form, "nameInput");
        NumericUpDown quantity = Find<NumericUpDown>(form, "quantityInput");
        Button preview = Find<Button>(form, "previewButton");
        Require(layout.Dock == DockStyle.Fill && layout.ColumnCount == 2, "Use a two-column filling layout.");
        Require(layout.GetColumn(name) == 1 && layout.GetRow(name) == 0, "Name input belongs beside Name.");
        Require(name.Dock == DockStyle.Fill && name.TabIndex == 0, "Name should fill its cell and be first in Tab order.");
        Require(quantity.Minimum == 0 && quantity.Maximum == 1000 && quantity.TabIndex == 1, "Keep UI range wide enough to exercise the rules.");
        Require(preview.Text == "&Preview" && preview.TabIndex == 2, "Preview needs its access key and Tab position.");
        int original = name.Width;
        form.ClientSize = new System.Drawing.Size(form.ClientSize.Width + 160, form.ClientSize.Height);
        form.PerformLayout();
        layout.PerformLayout();
        Require(name.Width > original, "The name field should grow when the form grows.");
    }

    private static void CheckPreview(Form form)
    {
        Find<TextBox>(form, "nameInput").Text = "  Ada  ";
        Find<NumericUpDown>(form, "quantityInput").Value = 2;
        Click(Find<Button>(form, "previewButton"));
        Require(Find<Label>(form, "statusLabel").Text == "Preview: Ada × 2", "Preview should read, trim and display both current values.");
        Find<TextBox>(form, "nameInput").Text = " ";
        Click(Find<Button>(form, "previewButton"));
        Require(Find<Label>(form, "statusLabel").Text == "Enter a name.", "Invalid input should stop the preview.");
    }

    private static ErrorProvider Errors(Form form)
    {
        FieldInfo? field = form.GetType().GetField("errors", BindingFlags.Instance | BindingFlags.NonPublic);
        Require(field?.GetValue(form) is ErrorProvider, "Keep an ErrorProvider field named errors.");
        return (ErrorProvider)field!.GetValue(form)!;
    }

    private static void CheckErrors(Form form)
    {
        TextBox name = Find<TextBox>(form, "nameInput");
        NumericUpDown quantity = Find<NumericUpDown>(form, "quantityInput");
        ErrorProvider errors = Errors(form);
        name.Text = " ";
        quantity.Value = 0;
        Click(Find<Button>(form, "previewButton"));
        Require(errors.GetError(name) == "Enter a name.", "Attach the name message to the name field.");
        Require(errors.GetError(quantity) == "Use a quantity from 1 to 100.", "Show both field errors in one attempt.");
        Require(Find<Label>(form, "statusLabel").Text == "Fix the marked fields.", "Do not report a successful preview.");
        name.Text = "Ada";
        Click(Find<Button>(form, "previewButton"));
        Require(errors.GetError(name) == "", "A corrected field must lose its old error.");
        Require(errors.GetError(quantity) != "", "The remaining error must stay visible.");
    }

    private static void CheckDialog()
    {
        Type? dialogType = typeof(MainForm).Assembly.GetType("FormDesk.RequestPreviewForm");
        Require(dialogType != null, "Create RequestPreviewForm.");
        RequestDraft draft = new RequestDraft { Name = "Ada", Quantity = 2 };
        using Form dialog = (Form)Activator.CreateInstance(dialogType!, draft)!;
        Require(Find<Label>(dialog, "summaryLabel").Text == "Ada × 2", "The dialog should display its draft.");
        Button confirm = Find<Button>(dialog, "confirmButton");
        Button cancel = Find<Button>(dialog, "cancelButton");
        Require(confirm.DialogResult == DialogResult.OK && ReferenceEquals(dialog.AcceptButton, confirm), "Enter should select confirmation.");
        Require(cancel.DialogResult == DialogResult.Cancel && ReferenceEquals(dialog.CancelButton, cancel), "Escape should select cancellation.");
        Require(dialog.StartPosition == FormStartPosition.CenterParent, "Center the preview over its owner.");
    }

    private static void Click(Button button)
    {
        // A hidden form makes CanSelect false, so PerformClick would silently do nothing.
        // Raise the real Button.Click event without showing any windows. Manual checks still
        // establish focus, keyboard behavior, actual ShowDialog outcomes and appearance.
        MethodInfo onClick = typeof(Button).GetMethod("OnClick", BindingFlags.Instance | BindingFlags.NonPublic)!;
        onClick.Invoke(button, new object[] { EventArgs.Empty });
    }

    private static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
}
