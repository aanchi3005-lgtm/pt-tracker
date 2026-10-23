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

## One-time setup (about 5 minutes, on a laptop)

Done once by whoever sets it up, signed in to the Gmail account that will keep the records (ideally the trainer's). **The trainer doesn't do any of this.** They just open the link you send them at the end.

1. **Copy the code.** Open the tracker website on the laptop and tap **Copy the code**.
2. **Make the sheet.** Open **https://sheets.new**, then click **Extensions → Apps Script**. Delete what's there, paste, and click 💾 **Save**.
3. **Publish it.** Click **Deploy → New deployment**, click ⚙ next to "Select type" and pick **Web app**. Set **Who has access** to **Anyone**, then click **Deploy**.
   Google asks for permission: click **Authorize access**, pick the account, click **Advanced → Go to … (unsafe) → Allow**. (Google shows "unsafe" for any script you add yourself. It only touches this one sheet.)
   Click the **Web app** link it shows once (a tab opens saying "PT Tracker is published"), then **Done**.
4. **Send the trainer link.** Go back to the Google Sheet and reload the page. A new **PT Tracker** menu appears. Click **PT Tracker → Get trainer link → Send on WhatsApp** and send it to the trainer.

**For the trainer:** open that link on your phone. That's it. In the phone browser use **Add to Home screen** so it opens like an app.

> The trainer link works like a password: anyone with it can change every record. Send it only to the trainer.
> If **Get trainer link** asks for a Web app URL, copy it from Apps Script → **Deploy → Manage deployments** (it ends in `/exec`) and paste it in.

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
- **Trainer link leaked:** in the Google Sheet, **PT Tracker → Make a new trainer link**, and send the new link to the trainer. The old one stops working.

## Backups

**Settings → Save backup file** downloads all records. **Load backup file** puts them back. The Google Sheet also keeps its own version history (File → Version history).

## Hosting

Static site on **GitHub Pages** (Settings → Pages → Branch: `main`, folder `/ (root)`). Files:

- `index.html` – the whole website
- `apps-script/Code.gs` – the Google Sheet code
