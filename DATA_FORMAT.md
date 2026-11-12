# 3omega-measurements-v1

Shared interchange format for convert_3omega v1.0.1 and calc_3omega v4.0.4.
The calculator also accepts existing instrument files without a format marker.

Converted files begin with JSON containing `data_format: "3omega-measurements-v1"`,
`converter_version`, `temperature_K`, and the original simulation parameters.
Each dataset begins with `***`, followed by `--- > R0 :` and one or more
positive resistance values in ohms. A table begins with `time /sec`.
Rows have these 11 whitespace-separated fields in this fixed order:

| Column | Header | Meaning |
|---|---|---|
| 1 | time /sec | Elapsed seconds (synthetic for converted simulation data) |
| 2 | temp /K | Temperature in kelvin, explicitly supplied for simulation data |
| 3 | current /mA | **Peak** heating current in mA; calculator divides by sqrt(2) and 1000 |
| 4 | freq /Hz | Positive heating frequency in Hz |
| 5 | R0 /Ohms | Resistance in ohms |
| 6 | esd R0 | Resistance standard uncertainty in ohms |
| 7 | V3X /V_rms | In-phase third-harmonic RMS voltage in V |
| 8 | esd V3X | Non-negative standard uncertainty in V |
| 9 | V3Y /V_rms | Out-of-phase third-harmonic RMS voltage in V |
| 10 | esd V3Y | Non-negative standard uncertainty in V |
| 11 | Data_Valid? | 1 = use observation; 0 = exclude observation |

Converted observations use validity 1. R0 and its uncertainty used for analysis
come from the R0 line (with the calculator's existing uncertainty floor);
the converter supplies zero row resistance scatter because none is simulated.
No start timestamp is invented. The calculator must not interpret the old
converter's RMS-current column as temperature or its phase column as validity.
Old converted files are rejected with instructions to reconvert them. A phase
of zero is not evidence of an invalid observation and cannot be repaired simply
by changing it to 1: temperature is also missing from that old format.
