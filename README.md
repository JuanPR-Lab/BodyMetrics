# BodyMetrics PWA 📊

BodyMetrics is a privacy-focused Progressive Web App (PWA) designed for dietitians and health professionals. It visualizes body composition data directly from **Tanita BC-601/602** SD cards without uploading any data to the cloud.

## 🚀 Features

* **100% Local & Private:** No server, no cloud database. All data remains in the browser.
* **SD Card Parsing:** Drag & drop `DATA.CSV` files directly from the scale.
* **Client Management:** Assign anonymous scale data to specific client profiles locally.
* **Interactive Charts:** Visualize progress (Weight, Body Fat, Muscle Mass, etc.) with dynamic charts.
* **Segmental Analysis:** Visual body map for arm/leg/trunk composition.
* **Export:** Generate standard CSV reports compatible with Excel/LibreOffice.
* **PWA Support:** Installable on Desktop and Mobile.

## 🛠️ Tech Stack

* **Framework:** [SvelteKit](https://kit.svelte.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **CSV Parsing:** PapaParse
* **I18n:** svelte-i18n (English/Spanish)

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/BodyMetrics.git](https://github.com/YOUR_USERNAME/BodyMetrics.git)
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

* `src/routes`: Main application pages.
* `src/lib/components`: Reusable UI components (BodyMap, etc.).
* `src/lib/utils`: Logic for CSV parsing, exporters, and data management.
* `src/lib/locales`: JSON translation files.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) for details on how to submit pull requests, report issues, and style guides.

## ⚠️ Disclaimers

### Not Affiliated with Tanita
**BodyMetrics** is an independent, open-source project and is **not** affiliated, associated, authorized, endorsed by, or in any way officially connected with **Tanita Corporation**, or any of its subsidiaries or its affiliates. The names Tanita and BC-601/602 as well as related names, marks, emblems, and images are registered trademarks of their respective owners.

### No Medical Advice
The information and data visualizations provided by this software are for **informational purposes only**. This software is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or seen in this application.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.