# PT Session Tracker – Planet Fitness

A simple website for **Pradeep Gahlot** (personal trainer, Planet Fitness) to mark personal training days for each client and note what was trained.

**Live site:** the link shown under **Settings → Pages** in this project.

- Mark each day as **Done**, **Missed** or **Cancelled**
- Note the **body parts** trained (Shoulders, Back, Glutes, Legs, Chest, Arms, Core / Abs, Full body, or type your own)
- Note the **training type** (Strength, Cardio, HIIT, Functional, Stretching / Mobility, Warm-up)
- Note the **exercises** (sets × reps @ kg), the client's **body weight** and **notes**
- See a **monthly calendar** for each client, coloured by status
- **Print or save a PDF** monthly report for any client
- Send each client **their own link** on WhatsApp. They can see and update their own training days, but never other clients.

No passwords. Records are kept in a **Google Sheet in the trainer's own Google account**, so nothing is stored anywhere else.

---

## One-time setup (about 10 minutes, on a laptop)

Do this signed in to the trainer's Gmail account.

### 1. Make the Google Sheet
1. Open **https://sheets.new**. A new blank sheet opens.
2. Click the title "Untitled spreadsheet" and rename it **PT Tracker**.

### 2. Add the tracker code
1. In the sheet, click **Extensions → Apps Script**.
2. Delete everything in the editor.
3. On the tracker website, open **How to make the Google Sheet** and tap **Copy the code** (or open [`apps-script/Code.gs`](apps-script/Code.gs) here and click the copy icon). Paste it into the editor.
4. Click the **💾 Save** icon.

### 3. Run the setup once
1. In the toolbar above the code, make sure **setup** is selected in the drop-down, then click **▶ Run**.
2. Google asks for permission. Click **Review permissions**, pick the trainer's account, click **Advanced → Go to PT Tracker (unsafe)**, then **Allow**.
   (Google shows "unsafe" for any script you write yourself. This one only touches this one sheet.)
3. At the bottom, the **Execution log** shows: `Your trainer key is: ……`. **Copy that key.**

### 4. Publish it as a web app
1. Click **Deploy → New deployment**.
2. Click the ⚙ gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and **copy the Web app URL** (it ends in `/exec`).

### 5. Connect the website
1. Open the live site (the link under **Settings → Pages**).
2. Paste the **Web app URL** and the **trainer key**, then tap **Connect**.

Done! 🎉

### 6. Open it on the trainer's phone (no typing)
On the laptop, open **Settings → Copy my trainer link**, and send it to the trainer's phone (WhatsApp to yourself works). Open it on the phone and it's set up. Tip: in the phone browser, use **Add to Home screen** so it opens like an app.

> Keep the trainer link private: anyone with it can change every record.

---

## Daily use

| To do this | Tap |
|---|---|
| Add a new client | **+ Add client** |
| Mark today's session | Pick the client → **+ Mark today** |
| Mark any other day | Tap the date on the calendar |
| Repeat a workout | In the day form, **Copy last workout**, then change what's different |
| Send a client their link | **Share client link → Send on WhatsApp** |
| Print / PDF a month | Go to that month → **Print / PDF report** (choose "Save as PDF" to keep a copy) |
| Turn off a leaked client link | **Share client link → Link shared by mistake? → Make a new link** |

The records can also be read straight in the Google Sheet (tabs **Clients** and **Sessions**).

---

## Changing things

- **Body parts, training types, exercise suggestions, gym or trainer name:** in `index.html`, edit the block marked `Settings you can change` near the start of the script.
- **Make client links view-only:** in Apps Script, change `var CLIENTS_CAN_EDIT = true;` to `false`, save, then **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. (Any change to the Apps Script code needs this step to go live. The URL stays the same.)
- **Trainer key leaked:** in Apps Script, run **newTrainerKey**, then on each device go to **Settings**, paste the new key and tap **Connect**.

## Backups

**Settings → Save backup file** downloads all records. **Load backup file** puts them back. The Google Sheet also keeps its own version history (File → Version history).

## Hosting

Static site on **GitHub Pages** (Settings → Pages → Branch: `main`, folder `/ (root)`). Files:

- `index.html` – the whole website
- `apps-script/Code.gs` – the Google Sheet code
