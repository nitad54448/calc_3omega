# 3-Omega 3D Surface Fit Analyzer: Explanation

## 1. Introduction

This document provides a detailed explanation for the "3-Omega 3D Surface Fit Analyzer" web application. This tool is designed to analyze experimental data obtained from the 3-omega ($3\omega$) method to determine the thermal conductivity and thermal diffusivity of materials, typically thin films or substrates.

The 3-omega method is a well-established AC technique where a metal line on the sample's surface acts as both a heater and a thermometer. An AC current at frequency $\omega$ is passed through the line, which causes Joule heating at frequency $2\omega$. Because the metal's resistance is temperature-dependent (characterized by the Temperature Coefficient of Resistance, or TCR), this $2\omega$ temperature oscillation induces a small voltage component at the third harmonic, $3\omega$. The in-phase and out-of-phase components of this $V_{3\omega}$ signal are directly related to the thermal properties of the underlying material.

This program moves beyond traditional 2D line-fitting methods. Instead of analyzing the frequency dependence of pre-averaged data, it performs a **3D surface fit** directly to the raw voltage data as a function of both **frequency ($\omega$)** and **current ($I$)**. This approach is more robust, as it uses all valid data points in a single regression, correctly models the physics, and provides a more reliable extraction of the thermal parameters.

The calculations assume a semi-infinite substrate, meaning the thermal wave from the heater does not reach the backside of the sample. The user-inputted substrate thickness is used to estimate the recommended frequency range for this assumption.

## 2. The Analytical Model: 3D Surface

For a metallic line heater on a semi-infinite substrate, the analytical solution for the in-phase component of the third-harmonic voltage ($V_{3\omega}$) can be expressed as a function of the RMS heating current ($I_{rms}$) and the angular frequency ($\omega = 2\pi f$).

This model is the foundation of the program's analysis. It can be rearranged into a linear form suitable for multiple linear regression (MLR), which is how the software performs the fit. The model takes the form of a plane: $Z = q_2 \cdot Y - q_1 \cdot Y \cdot X$, where the variables are:
* $Z = V_{3\omega, \text{in-phase}}$
* $Y = I_{rms}^3$
* $X = \ln(2\omega)$

The coefficients of the fit, $q_1$ and $q_2$, are determined by the physical parameters:
$$q_1 = \frac{R(T)^2 \alpha_{TCR}}{4 \pi L k}$$
$$q_2 = q_1 \cdot \ln\left(\frac{8\alpha_{diff}}{b^2 e^\gamma}\right)$$

Where:
* $R(T)$ is the heater resistance at the average measurement temperature, T.
* $\alpha_{TCR}$ is the temperature coefficient of resistance at T.
* $L$ is the length of the heater between the voltage probes.
* $k$ is the thermal conductivity of the substrate.
* $\alpha_{diff}$ is the thermal diffusivity of the substrate.
* $b$ is half the width of the heater line ($2b$ = total width).
* $\gamma$ is the Euler-Mascheroni constant ($\approx 0.5772$).

By performing a 3D surface fit to find the optimal values of $q_1$ and $q_2$, the program can solve for the desired physical properties, $k$ and $\alpha_{diff}$.

## 3. How the Program Works

### 3.1. Data Loading and Parsing

* **File Upload**: The user uploads a `.dat` text file.
* **File Format**: The program is designed for a specific data file structure:
    1.  An optional JSON header enclosed in `{...}` containing metadata, such as `"start time"`.
    2.  Data is divided into blocks, each separated by `***`. Each block represents a single measurement dataset.
    3.  Each data block must contain the initial resistance `R0` on a line like `--- > R0 : 58.17 ...`.
    4.  The main data table follows a header line. The key columns the program reads are:
        -   `freq /Hz`: The measurement frequency ($f$, not $\omega$).
        -   `I_peak /mA`: The peak AC heating current in milliamps. The program converts this to RMS Amps via $I_{rms} = I_{peak,mA} \cdot 10^{-3} / \sqrt{2}$.
        -   `V3x /V`: The in-phase component of the $3\omega$ voltage.
        -   `V3y /V`: The out-of-phase component of the $3\omega$ voltage.
        -   `valid`: A flag (1 or 0) indicating if the data point should be used in the analysis.
* **Automatic R(T) Fit**: If the datasets contain average temperature information, the program performs an automatic 2nd-order weighted polynomial regression on the collected ($T, R₀$) pairs to determine the coefficients for the R(T) relation.

### 3.2. User Inputs

The user must provide several key experimental and analysis parameters in the UI:

* **Phase Correction**: A checkbox to apply a 180° phase correction, which inverts the sign of the in-phase ($V_{3x}$) data.
* **Voltage Probe Distance (L)** and its uncertainty (in ppm).
* **Wire Width (2b)** and its uncertainty (in ppm).
* **Substrate Thickness (dₛ)**.
* **R(T) Coefficients (C₀, C₁, C₂) **: Defines the resistance-temperature relationship as $R(T) = C_2T^2 + C_1T + C_0$. These are used to calculate the resistance $R(T)$ and the local TCR $\alpha_{TCR}$ at the average temperature of each dataset.

### 3.3. The 3D Surface Fitting Process

For each dataset, the program performs the following steps:

1.  **Data Preparation**: It filters out any points marked as invalid (`valid=0`). It then constructs a set of data points for the surface fit: $(\ln(2\omega), I_{rms}^3, V_{3\omega, \text{in-phase}})$.
2.  **Multiple Linear Regression**: The program fits the analytical model to this set of 3D points to find the coefficients $q_1$ and $q_2$. The model solved by the code is $V_{3\omega, \text{in-phase}} = -q_1 \cdot (I_{rms}^3 \cdot \ln(2\omega)) + q_2 \cdot I_{rms}^3$.
3.  **Fit Methods**: The user can choose the regression algorithm:
    -   **Robust (Bisquare)**: The default method. It's an iterative regression that is less sensitive to outliers.
    -   **Weighted Least Squares (WLS)**: A standard regression that weights each point based on its measurement uncertainty.

### 3.4. Calculation of Physical Properties

Once the fit provides robust values for $q_1$ and $q_2$ (and their uncertainties, $esd_{q1}$ and $esd_{q2}$), the thermal properties are calculated.

1.  **Local TCR Calculation**: The local TCR at the dataset's average temperature T is found using the polynomial coefficients:
    $$
    \alpha_{TCR} = \frac{1}{R(T)}\frac{dR}{dT} = \frac{2C_2T + C_1}{C_2T^2 + C_1T + C_0}
    $$

2.  **Thermal Conductivity (k)**: The thermal conductivity is calculated by rearranging the equation for $q_1$:
    $$
    k = \frac{R(T)^2 \alpha_{TCR}}{4 \pi L q_1}
    $$
    The uncertainty, $esd_k$, is propagated from the uncertainties in $R(T)$, $L$, and $q_1$.

3.  **Thermal Diffusivity ($\alpha_{diff}$)**: The thermal diffusivity is calculated by rearranging the equation involving $q_2/q_1$:
    $$
    \alpha_{diff} = \frac{b^2 e^\gamma}{8} \exp\left(\frac{q_2}{q_1}\right)
    $$
    The uncertainty, $esd_{\alpha}$, is propagated from the uncertainties in $b$, $q_1$, and $q_2$.

## 4. Visualization and Reporting

### 4.1. Interactive Plots

* **3D Surface Plot**: The main visualization is an interactive 3D plot with the following axes:
    -   **Z-axis**: $V_{3\omega, \text{in-phase}}$ (V)
    -   **Y-axis**: $I_{rms}^3$ (A³)
    -   **X-axis**: $\ln(2\omega)$
    The plot shows the raw data points and the calculated best-fit surface, allowing for immediate visual inspection of the fit quality.
* **R(T) Plot**: The user can switch the visualization to see a plot of Resistance vs. Temperature. This shows the measured ($T, R_0$) data points and the fitted 2nd-order polynomial curve.

### 4.2. PDF Report Generation

The "Save Report" button generates a comprehensive, multi-page PDF document summarizing the analysis. The report includes:
* A **Title Page** with sample information and measurement dates.
* The full **JSON header** from the raw data file.
* A **Summary Table** listing the key results (Temp, R₀, k, α_diff) for every dataset analyzed.
* **Detailed Per-Dataset Pages**: For each dataset, a new page is created that includes the experimental parameters, final results, and a high-quality image of the **3D surface fit plot** for that specific dataset.
* **Summary Plots**: If multiple datasets were measured at different temperatures, the report concludes with summary plots showing:
    -   Resistance vs. Temperature
    -   Thermal Conductivity vs. Temperature
    -   Thermal Diffusivity vs. Temperature