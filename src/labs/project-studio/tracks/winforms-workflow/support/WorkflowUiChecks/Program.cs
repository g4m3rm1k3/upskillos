using FormDesk;
using FormDesk.Core;

internal static class Program
{
    private static void Expect(bool condition, string label)
    {
        if (!condition) throw new Exception(label);
    }

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            ApplicationConfiguration.Initialize();
            using MainForm form = new MainForm();
            TextBox name = (TextBox)form.Controls.Find("nameInput", true)[0];
            NumericUpDown quantity = (NumericUpDown)form.Controls.Find("quantityInput", true)[0];
            Button save = (Button)form.Controls.Find("saveButton", true)[0];
            Button open = (Button)form.Controls.Find("openButton", true)[0];
            Expect(save.TabIndex == 4 && open.TabIndex == 5, "file-button-order");
            RequestDraft original = new RequestDraft();
            original.Name = "Original";
            original.Quantity = 7;
            form.ApplyDraft(original);
            Expect(name.Text == "Original" && quantity.Value == 7, "valid-transfer");
            if (args[0] == "guard")
            {
                RequestDraft invalid = new RequestDraft();
                invalid.Name = "   ";
                invalid.Quantity = 3;
                Reject(invalid);
                invalid.Name = "Other";
                invalid.Quantity = 0;
                Reject(invalid);
                invalid.Quantity = 101;
                Reject(invalid);

                void Reject(RequestDraft draft)
                {
                    bool rejected = false;
                    try { form.ApplyDraft(draft); }
                    catch (InvalidDataException) { rejected = true; }
                    Expect(rejected, "invalid-draft-must-throw");
                    Expect(name.Text == "Original" && quantity.Value == 7, "invalid-draft-preserves-fields");
                }
            }
            else if (args[0] != "controls") throw new Exception("Unknown check mode");
            Console.WriteLine("workflow " + args[0] + ": passed");
            return 0;
        }
        catch (Exception failure)
        {
            Console.Error.WriteLine(failure.Message);
            return 1;
        }
    }
}
