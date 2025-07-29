# 3-Omega Data Analyzer: Explanation

## 1. Introduction

This document provides an explanation for the "3-Omega 2D Fit Analyzer" web application. This tool is designed to analyze experimental data obtained from the 3-omega (3ω) method to determine the thermal conductivity and thermal diffusivity of materials, typically thin films or substrates.

The 3-omega method is an AC technique where a metal line on the sample surface acts as both a heater and a thermometer. An AC current at frequency ω is passed through the line, causing Joule heating at frequency 2ω. Due to the material's temperature coefficient of resistance (TCR), this temperature oscillation induces a small voltage component at the third harmonic, 3ω. The magnitude and phase of this $V_{3\omega}$ signal are directly related to the thermal properties of the underlying material.

This program automates the process of parsing raw data files, performing advanced fitting procedures that account for both frequency and current dependence, and generating comprehensive reports. The calculations used here are made under the assumption that the substrate is semi-infinite; the thickness of the substrate is not used in the calculations now (maybe in some upgrade) but it is used such as the user has a record in the pdf report. It is mainly used as an indication so that the user can estimate the frequency range for linearity.

## 2. How the Program Works

### 2.1. Data Loading and Parsing

-   **File Upload**: The user starts by uploading a `.dat` file containing the experimental data.
-   **File Structure**: The program expects a specific format:
    1.  An optional JSON header enclosed in `{...}` containing metadata like the experiment's start time.
    2.  One or more data blocks, each separated by `***`.
    3.  Each data block must contain the initial resistance `R0` on a line like `--- > R0 : 58.17 ...`.
    4.  The main data table follows, with columns for time, frequency, peak current (mA), and the in-phase (V3x) and out-of-phase (V3y) components of the third-harmonic voltage. A final column indicates if a data point is valid (1) or invalid (0).

    ```
    {
      "start time": "2025-07-25 04:05:23"
    }
    ***
    --- > R0 : 58.17
    time /sec   freq /Hz I_peak /mA ... V3x /V ... V3y /V ... valid
    1.0         0.10     50.0       ... 1.2e-6 ... 3.4e-7 ... 1
    2.0         0.20     50.0       ... 1.1e-6 ... 3.2e-7 ... 1
    ...
    ***
    ```

    I am sorry I am using this messy datafile, but this is the format of datafile I get by using programs I wrote for data acquisition in my lab. Some examples are given in this repository. It is easy to convert your data to this datafile by using some scripts.


### 2.2. Parameter Input

The user must provide several key experimental parameters in the UI:

-   **Voltage Probe Distance (L)**: The length of the heater line between the voltage probes.
-   **Wire Width (2b)**: The total width of the heater line.
-   **TCR (α)**: The Temperature Coefficient of Resistance of the heater material [1/K].
-   **Substrate Thickness (dₛ)**: The thickness of the substrate material.

### 2.3. Data Processing and Analysis (Two-Step Fit)

The program employs a robust two-step fitting procedure to determine the normalized third-harmonic voltage ($V_{3\omega}/I^3_{rms}$) at each frequency.

1.  **Current Conversion**: The data file provides the heating current as a peak value in milliamps. The analysis requires the RMS value in Amps. The conversion is `I_rms = I_peak_mA * 1e-3 / sqrt(2)`.

2.  **Invalid Point Filtering**: For each frequency, the program first discards any data points marked as "invalid" in the data file. All subsequent calculations are performed only on the valid points.

3.  **Step 1: Fit Voltage vs. Current³ at Each Frequency**
    The core of the new method is to analyze the current dependence at each frequency. The program groups all valid data points by their frequency and handles them as follows:
    -   **Multiple Currents**: If there are valid data points at multiple distinct currents, a linear regression of $V_{3\omega}$ vs. $I^3_{rms}$ is performed. This fit is forced through the origin, as the relationship is physically expected to be $V_{3\omega} = m \cdot I^3_{rms}$. The slope ($m$) of this fit becomes the robust value for the normalized voltage ($V_{3\omega}/I^3_{rms}$), and the uncertainty of the slope becomes its error.
    -   **Repeated Measurements at Single Current**: If there are multiple valid points but all at the same current, the program calculates their average value. The uncertainty is conservatively taken as the larger of either the Standard Error of the Mean (from scatter) or the maximum individual uncertainty reported in the data file.
    -   **Single Measurement**: If only one valid data point exists, its value is normalized directly ($V_{3\omega}/I^3_{rms}$) and its reported uncertainty is propagated.

4.  **Step 2: Fit Normalized Voltage vs. Frequency**
    The set of robust normalized voltage points generated in Step 1 (one point per frequency) is then used for the final analysis. The program plots the normalized in-phase voltage (`V3_in-phase / I_rms^3`) against the natural logarithm of the angular frequency (`ln(2ω)`). In the frequency range where heat flow is one-dimensional into the substrate, this relationship is linear.
    -   **Fit Methods**: The user can choose between two fitting methods for this final step:
        -   **Weighted Least Squares (WLS)**: Standard linear regression that weights each data point by the inverse of its variance.
        -   **Robust (Bisquare)**: An iterative method that is less sensitive to outliers.

### 2.4. Calculation of Physical Properties

-   **Thermal Conductivity (k)**: The thermal conductivity of the substrate is calculated from the slope of the final linear fit of the in-phase data. The relationship is:
    $$ k = - \frac{R_0^2 \alpha_{TCR}}{4 \pi L \cdot \text{Slope}} $$
    Where `Slope` is the slope of the `(V3_in-phase / I_rms^3)` vs. `ln(2ω)` plot.

-   **Thermal Diffusivity (α)**: The thermal diffusivity is calculated from the intercepts and slope of both the in-phase and out-of-phase fits. It is derived from the analytical solution to the heat equation and is more accurate than simpler empirical formulas. The calculation is based on finding the frequency at which the out-of-phase signal's intercept would cross the in-phase signal.

### 2.5. Visualization and Reporting

-   **Interactive Plot**: The application generates an interactive plot showing the final processed in-phase and out-of-phase data points (one per frequency) along with the calculated linear fits. The user can adjust the fitting range with sliders.
-   **PDF Report**: A "Save Report" button generates a multi-page PDF document. The report includes:
    - The raw file header.
    - A comprehensive **Summary Table** with the final results for each dataset.
    - Individual pages for each dataset, showing the parameters, results, and the corresponding plot.
    - A final section with **Summary Plots**, which are auto-scaled to the data range, showing the results versus dataset index or temperature.
