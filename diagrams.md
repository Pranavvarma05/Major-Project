# Chandrayaan-2 CLASS Pipeline — UML Diagrams (Mermaid / StarUML)

---

## 1. Class Diagram (Entire System)

```mermaid
classDiagram
    direction TB

    class FITSFile {
        +String filePath
        +Header header
        +BinaryTableHDU hdu
        +open() HDUList
        +close() void
    }

    class DataExtractor {
        -String claRootDir
        -String xsmFilePath
        -List~String~ fitsFiles
        +loadXSMSolarFlux() float
        +loadCLASSSpectra() Tuple~ndarray, DataFrame~
        +extractCoordinates(header: Header) Tuple~float, float~
        +listCalibrated() List~String~
    }

    class XSMData {
        +ndarray dataArray
        +float solarFlux
        +computeMeanFlux() float
    }

    class CLASSSpectrum {
        +ndarray counts
        +float latitude
        +float longitude
        +String filename
        +float totalCounts
        +int nChannels
    }

    class RatioPreprocessor {
        -float solarFlux
        -StandardScaler scaler
        +normalizeBySolarFlux(counts: ndarray, solarFlux: float) ndarray
        +computeMgSiRatio(spectrum: ndarray) float
        +computeAlSiRatio(spectrum: ndarray) float
        +standardize(spectra: ndarray) ndarray
        +fitTransform(spectra: ndarray) ndarray
        +inverseTransform(spectra: ndarray) ndarray
    }

    class SpectralCNN {
        -Conv1d conv1
        -BatchNorm1d bn1
        -MaxPool1d pool1
        -Conv1d conv2
        -BatchNorm1d bn2
        -MaxPool1d pool2
        -Conv1d conv3
        -BatchNorm1d bn3
        -AdaptiveAvgPool1d globalPool
        -Linear fc1
        -Dropout dropout1
        -Linear fc2
        -Dropout dropout2
        -Linear fc3
        +forward(x: Tensor) Tensor
    }

    class CNNTrainer {
        -SpectralCNN model
        -MSELoss criterion
        -Adam optimizer
        -ReduceLROnPlateau scheduler
        -int epochs
        -int batchSize
        -float learningRate
        +prepareTargets(spectra: ndarray) ndarray
        +trainModel(trainLoader: DataLoader, valLoader: DataLoader) Tuple~List, List~
        +predict(spectra: ndarray) ndarray
        +evaluate(valLoader: DataLoader) float
    }

    class LunarMapper {
        -float moonRadius
        -dict elementColors
        -List~String~ elementSymbols
        +latLonToCartesian(lat: float, lon: float, R: float) Tuple~float, float, float~
        +createMoonWireframe(R: float) Tuple~ndarray, ndarray, ndarray~
        +generateGlobe(predictions: ndarray, coords: DataFrame) Figure
        +addElementTrace(fig: Figure, symbol: String, data: ndarray) void
        +configureLayout(fig: Figure) void
    }

    class PipelineOrchestrator {
        -DataExtractor extractor
        -RatioPreprocessor preprocessor
        -CNNTrainer trainer
        -LunarMapper mapper
        +runFullPipeline(rootDir: String) DataFrame
        +runDiagnostics(spectra: ndarray, meta: DataFrame) void
    }

    class AbundanceResult {
        +float Mg
        +float Al
        +float Si
        +float Ca
        +float Fe
        +float latitude
        +float longitude
        +float x
        +float y
        +float z
    }

    PipelineOrchestrator --> DataExtractor : uses
    PipelineOrchestrator --> RatioPreprocessor : uses
    PipelineOrchestrator --> CNNTrainer : uses
    PipelineOrchestrator --> LunarMapper : uses

    DataExtractor --> FITSFile : reads
    DataExtractor --> XSMData : extracts
    DataExtractor --> CLASSSpectrum : produces

    RatioPreprocessor --> CLASSSpectrum : consumes
    CNNTrainer --> SpectralCNN : trains
    CNNTrainer --> RatioPreprocessor : receives preprocessed data
    LunarMapper --> AbundanceResult : visualises

    CNNTrainer ..> AbundanceResult : produces
```

---

## 2. Use-Case Diagram (Entire System)

```mermaid
flowchart TB
    subgraph Actors
        Researcher(["🧑‍🔬 Planetary Scientist"])
        System(["⚙️ Pipeline System"])
        ISSDC(["🛰️ ISSDC Data Archive"])
    end

    subgraph UC_DataExtraction["Module: Data Extraction"]
        UC1["UC-1: Load CLASS L1 FITS Spectra"]
        UC2["UC-2: Load XSM Solar Flux"]
        UC3["UC-3: Extract Lat/Lon Coordinates"]
        UC4["UC-4: Validate FITS Headers"]
    end

    subgraph UC_Preprocessing["Module: Ratio Preprocessing"]
        UC5["UC-5: Normalise by Solar Flux"]
        UC6["UC-6: Compute Mg/Si Ratio"]
        UC7["UC-7: Compute Al/Si Ratio"]
        UC8["UC-8: Standardise Spectra"]
    end

    subgraph UC_CNN["Module: CNN Inference"]
        UC9["UC-9: Train 1D-CNN Model"]
        UC10["UC-10: Predict Elemental Abundances"]
        UC11["UC-11: Evaluate Model Performance"]
        UC12["UC-12: Denoise Spectral Signal"]
    end

    subgraph UC_Mapping["Module: Lunar Mapping"]
        UC13["UC-13: Project Abundances to 3D Globe"]
        UC14["UC-14: Interact with 3D Visualisation"]
        UC15["UC-15: Toggle Element Layers"]
        UC16["UC-16: Inspect Point-wise Composition"]
        UC17["UC-17: Run Diagnostic Analysis"]
    end

    Researcher --> UC1
    Researcher --> UC9
    Researcher --> UC13
    Researcher --> UC14
    Researcher --> UC15
    Researcher --> UC16
    Researcher --> UC17

    ISSDC --> UC1
    ISSDC --> UC2

    System --> UC3
    System --> UC4
    System --> UC5
    System --> UC6
    System --> UC7
    System --> UC8
    System --> UC10
    System --> UC11
    System --> UC12

    UC1 -.->|includes| UC3
    UC1 -.->|includes| UC4
    UC5 -.->|includes| UC2
    UC6 -.->|extends| UC5
    UC7 -.->|extends| UC5
    UC10 -.->|includes| UC12
    UC13 -.->|includes| UC10
```

---

## 3. Activity Diagrams (Module-wise)

### 3.1 Activity Diagram — Data Extraction Module

```mermaid
flowchart TB
    subgraph Researcher
        direction TB
        A_start((start)) --> A1([Initiate pipeline<br>execution])
    end

    subgraph DataExtractor
        direction TB
        A2([Set root<br>directory paths])
        A3([Open XSM<br>FITS file])
        A4([Read DataArray<br>from XSM HDU])
        A5([Concatenate all<br>XSM values])
        A6([Compute mean<br>solar flux])
        A7([List CLASS .fits files<br>in calibrated dir])
        A8{More FITS<br>files?}
        A9([Open next CLASS<br>FITS file])
        A10([Read COUNTS from<br>BinaryTableHDU])
        A11([Extract header<br>keywords: LAT, LON])
        A12{Coordinates<br>found?}
        A13([Store lat, lon])
        A14([Default<br>lat=0, lon=0])
        A15([Append spectrum<br>and metadata])
    end

    subgraph OutputStore["Output Store"]
        direction TB
        A16([Convert spectra<br>list to ndarray])
        A17([Create metadata<br>DataFrame])
        A18{merge}
        A_end((end))
    end

    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> A6
    A6 --> A7
    A7 --> A8
    A8 -- Yes --> A9
    A9 --> A10
    A10 --> A11
    A11 --> A12
    A12 -- Yes --> A13
    A12 -- No --> A14
    A13 --> A15
    A14 --> A15
    A15 --> A8
    A8 -- No --> A16
    A16 --> A17
    A17 --> A18
    A18 --> A_end
```

### 3.2 Activity Diagram — Ratio Preprocessing Module

```mermaid
flowchart TB
    subgraph PipelineOrchestrator
        direction TB
        B_start((start)) --> B1([Send raw spectra<br>and solar flux])
    end

    subgraph RatioPreprocessor
        direction TB
        B2([Divide each spectrum<br>by solar flux])
        B3([Compute Mg-band mean<br>channels 150-350])
        B4([Compute Si-band mean<br>channels 400-700])
        B5([Calculate<br>Mg/Si ratio])
        B6([Compute Al-band mean<br>channels 300-500])
        B7([Calculate<br>Al/Si ratio])
    end

    subgraph StandardScaler
        direction TB
        B8([Flatten spectra<br>to 2D matrix])
        B9([Fit scaler on<br>training data])
        B10([Transform spectra:<br>zero mean, unit var])
        B11{Verify mean approx 0<br>and std approx 1?}
        B12([Log warning<br>and re-scale])
    end

    subgraph Output["Output"]
        direction TB
        B13([Expand dims for<br>CNN input shape])
        B14{merge}
        B_end((end))
    end

    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> B5
    B5 --> B6
    B6 --> B7
    B7 --> B8
    B8 --> B9
    B9 --> B10
    B10 --> B11
    B11 -- Yes --> B13
    B11 -- No --> B12
    B12 --> B13
    B13 --> B14
    B14 --> B_end
```

### 3.3 Activity Diagram — CNN Inference Module

```mermaid
flowchart TB
    subgraph PipelineOrchestrator
        direction TB
        C_start((start)) --> C1([Send standardised<br>spectra])
    end

    subgraph CNNTrainer
        direction TB
        C2([Initialise<br>SpectralCNN model])
        C3([Define loss: MSELoss<br>optimiser: Adam])
        C4([Derive pseudo-targets<br>from spectral features])
        C5([Normalise targets<br>to 0-1 range])
        C6([Split data: 80% train<br>20% validation])
        C7([Create DataLoader<br>batch_size=16])
        C8{Epoch lte 100?}
        C16([Compute<br>MSE loss])
        C17([Backward pass and<br>gradient clipping])
        C18([Update weights<br>via Adam])
        C19([Validate on<br>val_loader])
        C20([Step LR scheduler<br>on val loss])
    end

    subgraph SpectralCNN
        direction TB
        C9([Forward pass through<br>3 Conv1D blocks])
        C10([Global Avg Pool<br>then FC then Dropout])
        C11([Sigmoid output<br>5 abundances])
    end

    subgraph ResultStore["Result Store"]
        direction TB
        C12([Set model to<br>eval mode])
        C13([Run inference on<br>full dataset])
        C14{Inference<br>success?}
        C15([Return 5-element<br>abundance predictions])
        C21([Log error and<br>return empty])
        C22{merge}
        C_end((end))
    end

    C1 --> C2
    C2 --> C3
    C3 --> C4
    C4 --> C5
    C5 --> C6
    C6 --> C7
    C7 --> C8
    C8 -- Yes --> C9
    C9 --> C10
    C10 --> C11
    C11 --> C16
    C16 --> C17
    C17 --> C18
    C18 --> C19
    C19 --> C20
    C20 --> C8
    C8 -- No --> C12
    C12 --> C13
    C13 --> C14
    C14 -- success --> C15
    C14 -- failure --> C21
    C15 --> C22
    C21 --> C22
    C22 --> C_end
```

### 3.4 Activity Diagram — Lunar Mapping Module

```mermaid
flowchart TB
    subgraph PipelineOrchestrator
        direction TB
        D_start((start)) --> D1([Send predictions<br>and coordinates])
    end

    subgraph LunarMapper
        direction TB
        D2([Convert lat/lon to<br>Cartesian x, y, z])
        D3([Create moon wireframe<br>sphere R=1737.4 km])
        D5{More elements<br>to plot?}
        D6([Select next element<br>Mg/Al/Si/Ca/Fe])
        D7([Normalise abundance<br>for marker sizing])
        D8([Assign element-specific<br>RGB colour])
        D9([Build hover text with<br>all 5 abundances])
    end

    subgraph PlotlyFigure["Plotly Figure"]
        direction TB
        D4([Add translucent<br>Surface trace])
        D10([Add Scatter3d trace<br>to figure])
        D11([Configure dark<br>theme layout])
        D12([Set camera position<br>and axis ranges])
        D13([Enable interactive<br>legend toggling])
    end

    subgraph WebFrontend["Web Frontend"]
        direction TB
        D14([Render interactive<br>3D globe])
        D15{User<br>interaction?}
        D16([Rotate / Zoom /<br>Hover tooltip])
        D17([Toggle element<br>layer visibility])
        D18{merge}
        D_end((end))
    end

    D1 --> D2
    D2 --> D3
    D3 --> D4
    D4 --> D5
    D5 -- Yes --> D6
    D6 --> D7
    D7 --> D8
    D8 --> D9
    D9 --> D10
    D10 --> D5
    D5 -- No --> D11
    D11 --> D12
    D12 --> D13
    D13 --> D14
    D14 --> D15
    D15 -- Yes --> D16
    D16 --> D17
    D17 --> D15
    D15 -- No --> D18
    D18 --> D_end
```

---

## 4. Sequence Diagrams (Module-wise)

### 4.1 Sequence Diagram — Data Extraction Module

```mermaid
sequenceDiagram
    participant R as Researcher
    participant P as PipelineOrchestrator
    participant DE as DataExtractor
    participant XSM as XSM FITS File
    participant CLA as CLASS FITS Files

    R->>P: runFullPipeline(rootDir)
    activate P
    P->>DE: loadXSMSolarFlux()
    activate DE
    DE->>XSM: fits.open(xsmFilePath)
    activate XSM
    XSM-->>DE: HDUList with DataArray
    deactivate XSM
    DE->>DE: concatenate all DataArray rows
    DE->>DE: computeMeanFlux()
    DE-->>P: solarFlux = mean value
    deactivate DE

    P->>DE: loadCLASSSpectra()
    activate DE
    DE->>DE: listCalibrated() → sorted .fits list
    loop For each FITS file (141 files)
        DE->>CLA: fits.open(filePath)
        activate CLA
        CLA-->>DE: HDUList
        deactivate CLA
        DE->>DE: extract COUNTS array
        DE->>DE: extractCoordinates(header)
        DE->>DE: append spectrum + metadata
    end
    DE->>DE: np.array(all_spectra)
    DE->>DE: pd.DataFrame(metadata)
    DE-->>P: (spectra_array, meta_df)
    deactivate DE
    deactivate P
```

### 4.2 Sequence Diagram — Ratio Preprocessing Module

```mermaid
sequenceDiagram
    participant P as PipelineOrchestrator
    participant RP as RatioPreprocessor
    participant SC as StandardScaler

    P->>RP: normalizeBySolarFlux(spectra, solarFlux)
    activate RP
    RP->>RP: spectra / solarFlux → normalized_spectra
    RP-->>P: normalized_spectra
    deactivate RP

    P->>RP: computeMgSiRatio(normalized_spectra)
    activate RP
    RP->>RP: Mg_band = mean(channels 150–350)
    RP->>RP: Si_band = mean(channels 400–700)
    RP->>RP: ratio = Mg_band / Si_band
    RP-->>P: mgSiRatio
    deactivate RP

    P->>RP: computeAlSiRatio(normalized_spectra)
    activate RP
    RP->>RP: Al_band = mean(channels 300–500)
    RP->>RP: ratio = Al_band / Si_band
    RP-->>P: alSiRatio
    deactivate RP

    P->>RP: fitTransform(normalized_spectra)
    activate RP
    RP->>RP: reshape to 2D (n_samples × n_channels)
    RP->>SC: fit_transform(spectra_flat)
    activate SC
    SC->>SC: compute mean and std per feature
    SC-->>RP: standardized_spectra
    deactivate SC
    RP-->>P: X_standardized (mean≈0, std≈1)
    deactivate RP
```

### 4.3 Sequence Diagram — CNN Inference Module

```mermaid
sequenceDiagram
    participant P as PipelineOrchestrator
    participant CT as CNNTrainer
    participant CNN as SpectralCNN
    participant DL as DataLoader

    P->>CT: prepareTargets(X_standardized)
    activate CT
    CT->>CT: derive pseudo-targets from spectral bands
    CT->>CT: normalize targets to [0, 1]
    CT-->>P: y_targets (n×5)
    deactivate CT

    P->>CT: trainModel(X_standardized, y_targets)
    activate CT
    CT->>CNN: initialise SpectralCNN()
    activate CNN
    CNN-->>CT: model instance
    deactivate CNN
    CT->>DL: create train/val DataLoaders
    activate DL
    DL-->>CT: trainLoader, valLoader
    deactivate DL

    loop epoch = 1 to 100
        CT->>CNN: forward(batch_X)
        activate CNN
        CNN->>CNN: Conv1D → BN → ReLU → Pool (×3)
        CNN->>CNN: GlobalAvgPool → FC → Dropout → Sigmoid
        CNN-->>CT: predictions (batch × 5)
        deactivate CNN
        CT->>CT: compute MSELoss
        CT->>CT: backward() + clip_grad_norm
        CT->>CT: optimizer.step()
        CT->>CT: validate on val_loader
        CT->>CT: scheduler.step(val_loss)
    end

    CT-->>P: trained model, train_losses, val_losses
    deactivate CT

    P->>CT: predict(X_standardized)
    activate CT
    CT->>CNN: forward(all_spectra)  [eval mode]
    activate CNN
    CNN-->>CT: abundance predictions (141 × 5)
    deactivate CNN
    CT-->>P: predictions [Mg, Al, Si, Ca, Fe]
    deactivate CT
```

### 4.4 Sequence Diagram — Lunar Mapping Module

```mermaid
sequenceDiagram
    participant R as Researcher
    participant P as PipelineOrchestrator
    participant LM as LunarMapper
    participant PL as Plotly Figure

    P->>LM: generateGlobe(predictions, coords_df)
    activate LM

    LM->>LM: latLonToCartesian(lat, lon, R=1737.4)
    Note right of LM: x = R·cos(θ)·cos(φ)<br>y = R·cos(θ)·sin(φ)<br>z = R·sin(θ)

    LM->>PL: go.Figure()
    activate PL
    PL-->>LM: empty figure
    deactivate PL

    LM->>LM: createMoonWireframe(R)
    LM->>PL: add_trace(Surface: wireframe sphere, opacity=0.08)

    loop For each element in [Mg, Al, Si, Ca, Fe]
        LM->>LM: normalise abundance → marker sizes (5–15)
        LM->>LM: assign RGB colour per element
        LM->>LM: build hover text with all 5 abundances
        LM->>PL: add_trace(Scatter3d: markers on sphere)
    end

    LM->>PL: update_layout(dark theme, camera, legend)
    LM->>PL: set axis range [−2500, 2500] km
    LM->>PL: fig.show()
    activate PL
    PL-->>R: Interactive 3D Lunar Globe
    deactivate PL

    R->>PL: rotate / zoom / hover
    PL-->>R: tooltip with elemental composition
    R->>PL: click legend entry
    PL-->>R: toggle element layer visibility

    LM-->>P: abundance_map DataFrame
    deactivate LM
```

---

## Quick Reference — Element Colour Map

| Element | Symbol | RGB | Colour |
|---------|--------|-----|--------|
| Magnesium | Mg | (255, 70, 70) | Red |
| Aluminum | Al | (70, 170, 255) | Blue |
| Silicon | Si | (70, 255, 100) | Green |
| Calcium | Ca | (255, 220, 70) | Gold |
| Iron | Fe | (255, 140, 70) | Orange |
