# 《心算大師》題目生成與驗證系統 (Unity/C# 架構設計與互動式工作台)

為手遊《心算大師》（Mental Math Master）打造高魯棒性、零過度工程化的核心題庫生成與算式驗證系統，結合純 C# 實作、Unity Test Runner 單元測試，以及網頁端即時試玩與壓力測試工作台。

---

## User Review & Critical Decisions

> [!IMPORTANT]
> 依據 Phase 1 需求確認，本系統遵循以下核心規範：

- **數字使用規則**：嚴格驗證。玩家輸入的算式必須恰好使用題目給定的 4 個基礎數字各一次（Multiset Exact Match）。
- **運算優先順序**：純先乘除後加減（無括號，嚴格遵從算術乘除優先級）。除法運算在每一步驟中皆需通過整除驗證（`remainder == 0`，且除數不得為 0）。
- **展示與驗證模式**：全方位呈現——包含手遊互動試玩面板、C# 原生代碼檢視/下載、以及單元測試與 1,000 題批次即時壓力驗證器。

---

## 1. Overview & Core Concept

- **系統定位**：為 Unity 手機遊戲提供運算效能高、無垃圾回收壓力（Zero-GC friendly）、保證 100% 有解的題目生成器（`MentalMathGenerator`），以及防作弊、合規性高、即時反饋的算式驗證器。
- **目標受眾**：Unity 遊戲客戶端開發者、企劃數值設計師，以及益智手遊玩家。
- **核心價值**：
  1. **保證有解**：利用逆向語法樹構建（Constructive Generation）與整除濾網，確保每一道題目皆能在先乘除後加減規則下計算出目標整數，杜絕無解壞題。
  2. **強健驗證**：線性掃描處理乘除法，再二次掃描處理加減法，在 $O(N)$ 時間與極低記憶體開銷下完成驗證，完全避免 `float` 浮點誤差與除以零崩潰。
  3. **單元測試完備**：提供 NUnit / Unity Test Framework 測試案例，覆蓋乘除優先級、非整除拒絕、除以零防禦、負數處理、邊界條件與千題隨機生成。

---

## 2. User Experience & Visual Design

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  心算大師 MENTAL MATH MASTER · 遊戲核心系統實驗室                             │
├──────────────────────────────────────────────────────────────────────────────┤
│  [🎮 遊戲試玩]     [🧪 單元測試執行器]     [📜 C# 原始碼]     [📊 壓力驗證]   │
├──────────────────────────────────────────────────────────────────────────────┤
│  目標數字: [ 24 ]        難度: [Lv.1 入門 | Lv.2 進階 | Lv.3 挑戰 | Lv.4 大師]│
│  基礎數字: [ 3 ]  [ 8 ]  [ 2 ]  [ 4 ]                                        │
│                                                                              │
│  當前算式: 3 × 8 + 4 ÷ 2                                                      │
│  即時步進: ① 3×8 = 24  ② 4÷2 = 2 (整除)  ③ 24 + 2 = 26  -> ❌ 目標為 24      │
│  可用運算子: [ + ]  [ − ]  [ × ]  [ ÷ ]   [ ⌫ 退格 ]   [ 💡 解答提示 ]       │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **視訊與色彩規劃**：
  - **60% 沉浸畫布**：深色石板底色（`slate-950` / `slate-900`），還原現代手遊與 Unity 編輯器質感。
  - **30% 結構表面**：高對比數字卡牌與運算面板（`slate-800`，微光倒角，柔和陰影）。
  - **10% 聚焦強調**：金色目標數字標籤（`amber-400`）、成功綠（`emerald-500`）與錯誤提示（`rose-400`）。
- **流暢互動**：
  - 支援點擊卡牌輸入與實體鍵盤快捷鍵（數字鍵、`+` `-` `*` `/`、Backspace、Enter）。
  - 當玩家完成算式時，即時動態拆解「先乘除後加減」的每步運算過程，並標記是否整除。
  - 答對時觸發粒子反饋與連擊紀錄。

---

## 3. Key Product Decisions & Trade-Offs

- **題目生成演算法：逆向建構 vs. 隨機搜尋回溯**
  - *採納做法*：以「結構化運算流（Reverse Constructive Generation）」為基礎，搭配難度字典隨機選取運算子，確保除法每一步皆為整除，並經由驗證器反向校驗。若遇極端限制則具備受限回溯重試機制（最多 20 次即可保證命中）。
  - *原因*：保證 100% 產出必定有整數解的題目，生成延遲小於 0.1ms，極度適合手遊無縫換題。
- **算式驗證器：雙清單（Two-Pass Token Scanner）vs. 抽象語法樹（AST）**
  - *採納做法*：使用雙 Pass 循序處理（Pass 1 摺疊所有 `*` 與 `/`；Pass 2 依序計算 `+` 與 `-`）。
  - *原因*：相較於編譯器等級的 AST 或 Shunting-yard 運算，雙 Pass 線性掃描對於 4 個數字的無括號四則運算僅需極少指令即可完成，代碼量少於 60 行，邏輯透明且易於在 Unity 進行代碼維護。
- **手機 GC 最佳化（Zero GC Allocation）**
  - *實作細節*：在 C# 中使用 `struct` 傳遞題目數據，內部運算利用固定長度陣列或傳入緩衝區，杜絕 LINQ 產生的額外 GC 垃圾，保護手遊幀率。

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   MentalMathGenerator (C#)                  │
├─────────────────────────────────────────────────────────────┤
│ + GenerateQuestion(difficulty: int): QuestionData           │
│ + ValidateEquation(numbers: List<int>,                      │
│                    operators: List<char>,                   │
│                    target: int): bool                       │
│ + ValidateEquationWithDetails(numbers, operators, target):  │
│                    ValidationResult                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐   ┌─────────────────────────┐
│     QuestionData (Struct)     │   │ ValidationResult (Struct│
├───────────────────────────────┤   ├─────────────────────────┤
│ + BaseNumbers: int[4]         │   │ + IsValid: bool         │
│ + TargetNumber: int           │   │ + CalculatedValue: int  │
│ + Difficulty: int             │   │ + ErrorReason: string   │
│ + ValidSolution: string       │   │ + StepBreakdowns: List  │
└───────────────────────────────┘   └─────────────────────────┘
```

### 核心類別介面規範

```csharp
public struct QuestionData
{
    public int[] Numbers;       // 恰好 4 個基礎數字
    public int Target;          // 目標整數
    public int Difficulty;      // 難度等級 (1 ~ 5)
    public string SampleEquation;// 至少一種保證解 (例如 "8 * 3 + 4 / 2")
}

public class MentalMathGenerator
{
    // 依據難度產出 4 個基礎數字與 1 個目標解答
    public QuestionData GenerateQuestion(int difficulty);

    // 驗證玩家輸入的算式是否合規且結果等於目標值
    public bool ValidateEquation(List<int> numbers, List<char> operators, int target);

    // 進階除錯與 UI 反饋專用（包含整除失敗、數字不符、除以零等明確錯誤訊息）
    public (bool isValid, int result, string errorMessage) ValidateEquationDetailed(
        List<int> numbers, List<char> operators, int target, int[] originalNumbers = null);
}
```

### 模組規劃與執行階段

1. **Phase 2.1: 核心 C# 邏輯與演算法實作**
   - 撰寫完整乾淨的 `MentalMathGenerator.cs`，包含 XML 註解。
   - 撰寫 NUnit / Unity Test Runner 測試套件 `MentalMathGeneratorTests.cs`。
2. **Phase 2.2: 網頁互動工作台（React + TypeScript）**
   - 將演算法精確轉譯為前端執行引擎，打造流暢直觀的 4 數字心算遊戲互動板。
   - 步進求值可視化：顯示「乘除階段」與「加減階段」的逐步數值計算與整除檢查。
3. **Phase 2.3: 單元測試與 1000 題批次驗證器**
   - 在前端介面中提供一鍵執行單元測試的視圖，包含綠色通過徽章與邊界案例展示。
   - 1,000 題隨機生成壓力測試儀表板，驗證 100% 題型有解率與平均生成耗時。
4. **Phase 2.4: 程式碼導出與 Unity 整合指南**
   - 提供語法高亮的 C# 代碼檢視器、一鍵複製與 `.cs` 下載功能。
   - 附帶 Unity MonoBehaviour / UI 連接範例，方便直接拖入 Unity 專案使用。
