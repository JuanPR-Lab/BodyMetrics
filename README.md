# BodyMetrics: Local-First Body Composition Analysis

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Svelte](https://img.shields.io/badge/svelte-%23f1413d.svg?style=flat&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)

**BodyMetrics** is a professional body composition analysis tool built with privacy at its core. It processes data from **Tanita BC-601, BC-602, and BC-613** scales directly in your browser.

> 🔒 **Privacy by Design:** Your complete client database lives locally in your browser (LocalStorage/IndexedDB). Raw measurement data remains physically on your SD card. **No cloud, no tracking, no data ever leaves your device.**

---

## 🚀 Features

- **Smart Inbox:** Drag & drop `DATA.CSV` files directly from the scale. Includes bulk selection and a streamlined "Assign to Client" workflow.
- **Client Management:** Create and rename clients, view complete history, and access interactive progress charts.
- **Segmental Analysis:** Interactive visual body map showing arm, leg, and trunk composition (Fat % & Muscle Mass).
- **Professional Workflow:** Unlock unlimited multi-user capability beyond the scale's 4-user hardware limitation.
- **Dynamic Charts:** Track progress over time for Weight, Body Fat, Muscle Mass, Visceral Fat, and more.
- **Data Sovereignty:** Full JSON Backup System—export and import your complete database anytime.
- **Universal Export:** Generate clean `.csv` reports compatible with Excel, Numbers, Google Sheets, and LibreOffice.
- **Multi-Language:** Native support for English and Spanish.

---

## 🔄 Professional Workflow (Unlimited Users)

While **Tanita BC-601/602/613** scales limit onboard memory to only 4 users, BodyMetrics serves as your unlimited archive system. The workflow is simple:

1.  **Use a Generic User Slot:** Select any available user slot on the physical scale to take the measurement.
2.  **Import to Inbox:** Insert the SD card into your computer and drag the `.CSV` files into the BodyMetrics **Inbox** tab.
3.  **Assign to Clients:** Organize the imported data by assigning measurements to specific Client Profiles within the app.

*This approach allows you to serve unlimited clients while adhering to the scale's hardware limitations.*

---

## 🛠️ Technical Stack

This project is built using a modern, performance-focused stack:

-   **Framework:** [SvelteKit](https://kit.svelte.dev/)
-   **Styling:** [TailwindCSS](https://tailwindcss.com/)
-   **Language:** TypeScript
-   **Icons:** Lucide Icons
-   **Visualization:** Chart.js
-   **Internationalization:** svelte-i18n
-   **Data Storage:** LocalStorage / IndexedDB (Client-side only)

## 📂 Architecture

A quick look at the project structure for developers:

-   `src/lib/components`: Reusable UI components (BodyMap, Inbox, ClientDashboard, etc.)
-   `src/lib/utils`: Core utilities for CSV parsing, patient management, and data export.
-   `src/lib/locales`: Internationalization dictionaries (English/Spanish).
-   `src/routes`: Main application pages and routing logic.

---

## 📦 Installation

To run BodyMetrics locally or contribute to development:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/JuanPR-Lab/BodyMetrics.git](https://github.com/JuanPR-Lab/BodyMetrics.git)
    cd BodyMetrics
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Run development server:**
    ```bash
    npm run dev
    ```

4.  Open your browser at `http://localhost:5173`.

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a Pull Request.

---

## ⚠️ Disclaimers

### Not Affiliated with Tanita
**BodyMetrics** is an independent, open-source project and is **not** affiliated, associated, authorized, endorsed by, or in any way officially connected with **Tanita Corporation**. The names Tanita and **BC-601 / BC-602 / BC-613** are registered trademarks of their respective owners.

### No Medical Advice
The information and data visualizations provided by this software are for **informational purposes only**. This software is not intended to be a substitute for professional medical advice, diagnosis, or treatment.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.