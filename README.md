# BodyMetrics PWA 📊

**BodyMetrics** is a Segmental Body Composition Analysis tool with total privacy. It visualizes data directly from **Tanita BC-601/602** SD cards without uploading a single byte to the cloud.

> 🔒 **Privacy by Design:** Your Client Database lives in your browser's Local Storage. Medical measurement data remains physically on your SD Card. Nothing is sent to any server.

## 🚀 Features

* **100% Local & Private:** Zero cloud dependency.
* **SD Card Parsing:** Drag & drop `DATA.CSV` files directly from the scale.
* **Smart Client Management:** Assign anonymous scale data (IDs) to specific Client Profiles locally.
* **Segmental Analysis:** Interactive visual body map for arm/leg/trunk composition (Fat % & Muscle Mass).
* **Dynamic Charts:** Visualize progress (Weight, Body Fat, Muscle Mass, Visceral Fat, etc.) over time.
* **Universal Export:** Generate clean `.csv` reports compatible with Excel, Numbers, Google Sheets, and LibreOffice.
* **PWA Support:** Installable on Desktop and Mobile as a native-like app.

## 🔄 The "Safe Workflow" (The SD Card Trick)

Since the BC-601/602 scales only have 4 memory slots and "Guest Mode" doesn't save data, BodyMetrics acts as your unlimited archive. To switch patients without losing data on the scale:

1.  **Remove SD Card:** Take the card out of the scale.
2.  **Edit User:** Press and hold **SET** on the scale to edit a "Wildcard User" (e.g., User 4). Update age/height/gender for the *new* patient.
3.  **Re-insert & Weigh:** Put the SD card back in and weigh the patient.
    * *Why?* This tricks the scale into saving the new reading without sending the "erase history" command to the card.
4.  **Import:** Move SD to PC, drag files here, and assign to a Client.

## 🛠️ Tech Stack

* **Framework:** [SvelteKit](https://kit.svelte.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Logic:** TypeScript
* **CSV Parsing:** PapaParse
* **I18n:** svelte-i18n (English/Spanish)

## 📦 Installation (For Developers)

If you want to run this locally or contribute:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/JuanPR-Lab/BodyMetrics.git](https://github.com/JuanPR-Lab/BodyMetrics.git)
    cd BodyMetrics
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run development server:**
    ```bash
    npm run dev
    ```

4.  Open your browser at `http://localhost:5173`.

## 📂 Project Structure

* `src/routes/+page.svelte`: Main application logic and UI.
* `src/lib/components`: Reusable UI components (e.g., `BodyMap.svelte`).
* `src/lib/utils`: Core logic for `csvSDparser`, `patientManager`, and `exporters`.
* `src/lib/locales`: Translation files (`es.json`, `en.json`).

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md).

## ⚠️ Disclaimers

### Not Affiliated with Tanita
**BodyMetrics** is an independent, open-source project and is **not** affiliated, associated, authorized, endorsed by, or in any way officially connected with **Tanita Corporation**. The names Tanita and BC-601/602 are registered trademarks of their respective owners.

### No Medical Advice
The information and data visualizations provided by this software are for **informational purposes only**. This software is not intended to be a substitute for professional medical advice, diagnosis, or treatment.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.