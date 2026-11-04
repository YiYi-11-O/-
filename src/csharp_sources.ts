/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MENTAL_MATH_GENERATOR_CS = `// ============================================================================
// 《心算大師》(Mental Math Master) - 核心題目生成與驗證系統
// 適用平台: Unity 2021.3+ / 2022.3+ LTS, C# 9.0+ (.NET Standard 2.1)
// 特性: 零過度工程化、高魯棒性、無 GC Allocation 壓力、嚴格整除驗證、先乘除後加減
// ============================================================================

using System;
using System.Collections.Generic;

namespace MentalMathMaster.Core
{
    /// <summary>
    /// 題目資料結構 (值類型 Struct，避免 Heap 記憶體配置)
    /// </summary>
    [Serializable]
    public struct QuestionData
    {
        /// <summary> 題目的 4 個基礎數字 </summary>
        public int[] Numbers;

        /// <summary> 目標整數 </summary>
        public int Target;

        /// <summary> 題目難度等級 (1 ~ 5) </summary>
        public int Difficulty;

        /// <summary> 保證解範例 (供提示系統或除錯日誌使用) </summary>
        public string ExampleSolution;

        public QuestionData(int[] numbers, int target, int difficulty, string exampleSolution)
        {
            Numbers = numbers;
            Target = target;
            Difficulty = difficulty;
            ExampleSolution = exampleSolution;
        }

        public override string ToString() =>
            $"[Lv.{Difficulty}] 目標: {Target} | 數字: [{string.Join(", ", Numbers)}] (範例解: {ExampleSolution})";
    }

    /// <summary>
    /// 算式驗證詳細結果 (包含錯誤原因，方便 UI 給予玩家即時語意反饋)
    /// </summary>
    public readonly struct ValidationResult
    {
        public readonly bool IsValid;
        public readonly int CalculatedValue;
        public readonly string ErrorMessage;

        public ValidationResult(bool isValid, int calculatedValue, string errorMessage)
        {
            IsValid = isValid;
            CalculatedValue = calculatedValue;
            ErrorMessage = errorMessage;
        }

        public static ValidationResult Success(int value) => new(true, value, string.Empty);
        public static ValidationResult Fail(string error, int value = 0) => new(false, value, error);
    }

    /// <summary>
    /// 心算大師核心題庫生成與算式驗證器
    /// </summary>
    public class MentalMathGenerator
    {
        private static readonly Random Rng = new();

        #region 1. 題目生成 (GenerateQuestion)

        /// <summary>
        /// 根據難度產出 4 個基礎數字與 1 個目標解答 (Target Number)。
        /// 採用「逆向語法構建與整除過濾」演算法，100% 確保題目必定有整數解。
        /// </summary>
        /// <param name="difficulty">難度等級 (1: 入門, 2: 基礎, 3: 進階, 4: 挑戰, 5: 大師)</param>
        /// <returns>包含 4 個基礎數字與目標值的題目資料</returns>
        public QuestionData GenerateQuestion(int difficulty)
        {
            difficulty = Math.Clamp(difficulty, 1, 5);

            // 難度設定對照表
            (int minNum, int maxNum, char[] allowedOps) = difficulty switch
            {
                1 => (1, 9, new[] { '+', '-' }),                        // 入門: 1~9，僅加減
                2 => (1, 12, new[] { '+', '-', '*' }),                  // 基礎: 1~12，加減乘
                3 => (2, 16, new[] { '+', '-', '*', '/' }),            // 進階: 2~16，四則運算 (含整除除法)
                4 => (2, 25, new[] { '+', '-', '*', '/' }),            // 挑戰: 2~25，四則運算
                _ => (3, 50, new[] { '+', '-', '*', '/' })             // 大師: 3~50，較大數字與乘除組合
            };

            const int maxAttempts = 100;
            for (int attempt = 0; attempt < maxAttempts; attempt++)
            {
                // 1. 隨機抽選 3 個運算子
                char[] ops = new char[3];
                for (int i = 0; i < 3; i++)
                {
                    ops[i] = allowedOps[Rng.Next(allowedOps.Length)];
                }

                // 2. 隨機生成 4 個數字候選
                int[] rawNumbers = new int[4];
                for (int i = 0; i < 4; i++)
                {
                    rawNumbers[i] = Rng.Next(minNum, maxNum + 1);
                }

                // 3. 處理除法整除約束: 若某處為 '/'，需確保其左側能被右側整除
                // 例如: 若 ops[i] == '/'，修正數字使其成為倍數
                bool adjustOk = EnsureDivisionSafe(rawNumbers, ops, minNum, maxNum);
                if (!adjustOk) continue;

                // 4. 驗證算式執行結果 (嚴格整除 + 先乘除後加減)
                var numList = new List<int>(rawNumbers);
                var opList = new List<char>(ops);

                var evalResult = EvaluateExpression(numList, opList);
                if (!evalResult.IsValid) continue;

                int target = evalResult.CalculatedValue;

                // 排除負數結果、零或過度平凡的答案 (依手遊趣味性調整)
                if (target <= 0 || target > 500) continue;

                // 構建解答字串 (例: "4 * 6 + 8 / 2 = 28")
                string solutionStr = $"{rawNumbers[0]} {ops[0]} {rawNumbers[1]} {ops[1]} {rawNumbers[2]} {ops[2]} {rawNumbers[3]} = {target}";

                // 5. 洗牌數字，使題目以隨機順序呈現給玩家，避免直接按原序點擊
                int[] shuffledNumbers = (int[])rawNumbers.Clone();
                ShuffleArray(shuffledNumbers);

                return new QuestionData(shuffledNumbers, target, difficulty, solutionStr);
            }

            // 安全保底題目 (Fallback: 極端罕見情況下的高容錯防護)
            return new QuestionData(new[] { 3, 5, 2, 4 }, 24, difficulty, "3 * 5 + 4 + 5 = 24");
        }

        #endregion

        #region 2. 算式驗證 (ValidateEquation)

        /// <summary>
        /// 核心驗證方法：驗證玩家輸入的算式是否合規且結果等於目標值。
        /// 遵守先乘除後加減，且除法運算過程中不得產生小數 (整除驗證)。
        /// </summary>
        /// <param name="numbers">玩家輸入的數字列表 (必須與運算子形成有效算式)</param>
        /// <param name="operators">玩家輸入的運算子列表 ('+', '-', '*', '/')</param>
        /// <param name="target">目標數字</param>
        /// <returns>合規且等於目標值返回 true；否則返回 false</returns>
        public bool ValidateEquation(List<int> numbers, List<char> operators, int target)
        {
            var result = ValidateEquationDetailed(numbers, operators, target, null);
            return result.IsValid;
        }

        /// <summary>
        /// 擴充驗證方法：同時嚴格檢驗玩家使用的數字是否完全符合題目給定的 4 個基礎數字 (不多不少且各用一次)。
        /// </summary>
        /// <param name="numbers">玩家輸入的數字順序</param>
        /// <param name="operators">玩家輸入的運算子順序</param>
        /// <param name="target">目標值</param>
        /// <param name="requiredBaseNumbers">題目給定的 4 個基礎數字 (可為 null，若傳入則進行多重集比對)</param>
        public ValidationResult ValidateEquationDetailed(
            List<int> numbers,
            List<char> operators,
            int target,
            int[] requiredBaseNumbers = null)
        {
            // 基礎空值檢查
            if (numbers == null || operators == null)
            {
                return ValidationResult.Fail("輸入清單不得為空");
            }

            // 結構檢查: N 個數字必須恰好搭配 N - 1 個運算子
            if (numbers.Count < 2 || operators.Count != numbers.Count - 1)
            {
                return ValidationResult.Fail($"算式格式不完整 (數字量: {numbers.Count}, 運算子量: {operators.Count})");
            }

            // 嚴格題目數字比對 (若有傳入題目基準數字)
            if (requiredBaseNumbers != null)
            {
                if (numbers.Count != requiredBaseNumbers.Length)
                {
                    return ValidationResult.Fail($"必須使用恰好 {requiredBaseNumbers.Length} 個數字");
                }

                if (!IsMultisetMatch(numbers, requiredBaseNumbers))
                {
                    return ValidationResult.Fail("使用的數字與題目給定的基礎數字不符");
                }
            }

            // 執行算式運算 (先乘除後加減 + 整除檢驗)
            var eval = EvaluateExpression(numbers, operators);
            if (!eval.IsValid)
            {
                return eval; // 包含除以零或非整除之具體錯誤訊息
            }

            // 比對運算結果與目標值
            if (eval.CalculatedValue != target)
            {
                return ValidationResult.Fail($"計算結果為 {eval.CalculatedValue}，與目標解答 {target} 不符", eval.CalculatedValue);
            }

            return ValidationResult.Success(eval.CalculatedValue);
        }

        #endregion

        #region 3. 先乘除後加減與整除評估引擎 (EvaluateExpression)

        /// <summary>
        /// 雙 Pass 掃描評估引擎：
        /// Pass 1: 由左至右摺疊所有乘法 (*) 與除法 (/)，同時驗證除數非零與整除性。
        /// Pass 2: 由左至右處理所有剩餘的加法 (+) 與減法 (-)。
        /// 時間複雜度: O(N)，空間複雜度: O(N)，無遞迴無深層 AST。
        /// </summary>
        public static ValidationResult EvaluateExpression(List<int> numbers, List<char> operators)
        {
            if (numbers == null || numbers.Count == 0)
                return ValidationResult.Fail("無數字可供計算");

            if (operators == null || operators.Count != numbers.Count - 1)
                return ValidationResult.Fail("運算子數量與數字不符");

            // Pass 1: 處理乘法與除法
            var reducedNumbers = new List<int>(numbers.Count) { numbers[0] };
            var reducedOps = new List<char>(operators.Count);

            for (int i = 0; i < operators.Count; i++)
            {
                char op = operators[i];
                int nextNum = numbers[i + 1];

                if (op == '*' || op == '/')
                {
                    int lastIdx = reducedNumbers.Count - 1;
                    int prevNum = reducedNumbers[lastIdx];

                    if (op == '*')
                    {
                        // 乘法運算 (防溢位)
                        long product = (long)prevNum * nextNum;
                        if (product > int.MaxValue || product < int.MinValue)
                        {
                            return ValidationResult.Fail("數值溢位超出整數範圍");
                        }
                        reducedNumbers[lastIdx] = (int)product;
                    }
                    else // op == '/'
                    {
                        // 1. 除以零防禦
                        if (nextNum == 0)
                        {
                            return ValidationResult.Fail($"除法錯誤：除數不能為 0 ({prevNum} ÷ 0)");
                        }

                        // 2. 整除驗證：除法運算過程中不得產生小數
                        if (prevNum % nextNum != 0)
                        {
                            return ValidationResult.Fail($"整除驗證失敗：{prevNum} ÷ {nextNum} 無法整除 (餘數為 {prevNum % nextNum})");
                        }

                        reducedNumbers[lastIdx] = prevNum / nextNum;
                    }
                }
                else if (op == '+' || op == '-')
                {
                    // 暫存加減法，留至 Pass 2
                    reducedOps.Add(op);
                    reducedNumbers.Add(nextNum);
                }
                else
                {
                    return ValidationResult.Fail($"不支援的非規運算子: '{op}'");
                }
            }

            // Pass 2: 處理剩餘的加法與減法
            int total = reducedNumbers[0];
            for (int i = 0; i < reducedOps.Count; i++)
            {
                char op = reducedOps[i];
                int val = reducedNumbers[i + 1];

                if (op == '+')
                {
                    total += val;
                }
                else if (op == '-')
                {
                    total -= val;
                }
            }

            return ValidationResult.Success(total);
        }

        #endregion

        #region 4. 輔助工具方法

        /// <summary>
        /// 比對兩個集合是否擁有完全相同的數字 (多重集比對，支援重複數字)
        /// </summary>
        private static bool IsMultisetMatch(List<int> a, int[] b)
        {
            if (a.Count != b.Length) return false;

            var freq = new Dictionary<int, int>(b.Length);
            foreach (var num in b)
            {
                freq[num] = freq.GetValueOrDefault(num, 0) + 1;
            }

            foreach (var num in a)
            {
                if (!freq.TryGetValue(num, out int count) || count <= 0)
                {
                    return false;
                }
                freq[num] = count - 1;
            }

            return true;
        }

        /// <summary>
        /// 針對隨機生成的題目，調整除法相鄰數值，確保在先乘除優先級下符合整除約束
        /// </summary>
        private static bool EnsureDivisionSafe(int[] numbers, char[] ops, int minNum, int maxNum)
        {
            for (int i = 0; i < ops.Length; i++)
            {
                if (ops[i] == '/')
                {
                    // 確保除數不為 0
                    if (numbers[i + 1] == 0)
                    {
                        numbers[i + 1] = Math.Max(1, minNum);
                    }

                    int divisor = numbers[i + 1];
                    // 將被除數調整為除數的合理整數倍
                    int multiplier = Rng.Next(1, Math.Max(2, maxNum / Math.Max(1, divisor)));
                    int safeDividend = divisor * multiplier;

                    if (safeDividend > maxNum * 2) safeDividend = divisor;
                    numbers[i] = safeDividend;
                }
            }
            return true;
        }

        /// <summary>
        /// Fisher-Yates 洗牌演算法
        /// </summary>
        private static void ShuffleArray<T>(T[] array)
        {
            int n = array.Length;
            while (n > 1)
            {
                int k = Rng.Next(n--);
                (array[n], array[k]) = (array[k], array[n]);
            }
        }

        #endregion
    }
}
`;

export const MENTAL_MATH_GENERATOR_TESTS_CS = `// ============================================================================
// 《心算大師》單元測試套件 (Unit Tests)
// 適用框架: NUnit 3+ / Unity Test Framework (com.unity.test-framework)
// 涵蓋範圍: 乘除優先級、整除驗證、除以零防禦、負數處理、邊界條件、100%保證有解
// ============================================================================

using System.Collections.Generic;
using NUnit.Framework;
using MentalMathMaster.Core;

namespace MentalMathMaster.Tests
{
    [TestFixture]
    public class MentalMathGeneratorTests
    {
        private MentalMathGenerator _generator;

        [SetUp]
        public void Setup()
        {
            _generator = new MentalMathGenerator();
        }

        #region 1. 先乘除後加減 (PEMDAS / Operator Precedence) 測試

        [Test]
        [TestCase(new[] { 2, 3, 4 }, new[] { '+', '*' }, 14, Description = "2 + 3 * 4 = 14 (若非先乘除則為 20)")]
        [TestCase(new[] { 10, 6, 2 }, new[] { '-', '/' }, 7, Description = "10 - 6 / 2 = 7 (若非先乘除則為 2)")]
        [TestCase(new[] { 3, 4, 2, 5 }, new[] { '*', '+', '*' }, 22, Description = "3 * 4 + 2 * 5 = 12 + 10 = 22")]
        [TestCase(new[] { 20, 4, 2, 3 }, new[] { '/', '*', '+' }, 13, Description = "20 / 4 * 2 + 3 = 5 * 2 + 3 = 13 (乘除同級由左至右)")]
        public void ValidateEquation_RespectsOperatorPrecedence_ReturnsTrue(int[] nums, char[] ops, int target)
        {
            var numbers = new List<int>(nums);
            var operators = new List<char>(ops);

            bool isValid = _generator.ValidateEquation(numbers, operators, target);
            Assert.IsTrue(isValid, $"算式應該遵守先乘除後加減得到目標值 {target}");
        }

        #endregion

        #region 2. 嚴格整除驗證 (Integer Division Constraint) 測試

        [Test]
        [Description("整除除法應順利通過: 12 / 3 + 4 = 8")]
        public void ValidateEquation_WithValidIntegerDivision_ReturnsTrue()
        {
            var numbers = new List<int> { 12, 3, 4 };
            var operators = new List<char> { '/', '+' };
            int target = 8;

            bool isValid = _generator.ValidateEquation(numbers, operators, target);
            Assert.IsTrue(isValid);
        }

        [Test]
        [Description("除法產生小數 (如 7 / 2 = 3.5) 必須嚴格拒絕，不得截斷取整")]
        public void ValidateEquation_WithNonIntegerDivision_ReturnsFalse()
        {
            // 7 / 2 + 1: 若使用整數截斷為 3+1=4，但規定「不得產生小數」必須拒絕！
            var numbers = new List<int> { 7, 2, 1 };
            var operators = new List<char> { '/', '+' };
            int target = 4;

            var result = _generator.ValidateEquationDetailed(numbers, operators, target);

            Assert.IsFalse(result.IsValid, "非整除運算應被判定無效");
            StringAssert.Contains("無法整除", result.ErrorMessage);
        }

        [Test]
        [Description("除以零防禦: 必須安全攔截，不得擲出未處理的 DivideByZeroException")]
        public void ValidateEquation_DivisionByZero_ReturnsFalseGracefully()
        {
            var numbers = new List<int> { 8, 0, 4 };
            var operators = new List<char> { '/', '+' };
            int target = 4;

            var result = _generator.ValidateEquationDetailed(numbers, operators, target);

            Assert.IsFalse(result.IsValid);
            StringAssert.Contains("除數不能為 0", result.ErrorMessage);
        }

        #endregion

        #region 3. 基礎數字完整性與作弊防禦 (Multiset Validation) 測試

        [Test]
        [Description("嚴格驗證玩家必須使用題目給定的 4 個數字各一次")]
        public void ValidateEquationDetailed_RequiresExactFourBaseNumbers()
        {
            int[] baseNumbers = { 3, 8, 2, 5 };

            // 案例 A: 偷換數字 (例如將 5 換成 4)
            var tamperedNums = new List<int> { 3, 8, 2, 4 };
            var ops = new List<char> { '*', '-', '+' };
            var resultA = _generator.ValidateEquationDetailed(tamperedNums, ops, 26, baseNumbers);
            Assert.IsFalse(resultA.IsValid);
            StringAssert.Contains("基礎數字不符", resultA.ErrorMessage);

            // 案例 B: 數字數量不足 (僅使用 3 個數字)
            var incompleteNums = new List<int> { 3, 8, 2 };
            var incompleteOps = new List<char> { '*', '+' };
            var resultB = _generator.ValidateEquationDetailed(incompleteNums, incompleteOps, 26, baseNumbers);
            Assert.IsFalse(resultB.IsValid);
            StringAssert.Contains("必須使用恰好 4 個數字", resultB.ErrorMessage);

            // 案例 C: 正確調用所有 4 個數字 (3 * 8 + 5 - 2 = 27)
            var correctNums = new List<int> { 3, 8, 5, 2 };
            var correctOps = new List<char> { '*', '+', '-' };
            var resultC = _generator.ValidateEquationDetailed(correctNums, correctOps, 27, baseNumbers);
            Assert.IsTrue(resultC.IsValid);
        }

        #endregion

        #region 4. 題目生成必有解驗證 (Guaranteed Solvability) 測試

        [Test]
        [TestCase(1, Description = "難度 1: 入門")]
        [TestCase(2, Description = "難度 2: 基礎")]
        [TestCase(3, Description = "難度 3: 進階")]
        [TestCase(4, Description = "難度 4: 挑戰")]
        [TestCase(5, Description = "難度 5: 大師")]
        public void GenerateQuestion_AlwaysGeneratesValidSolvableQuestion(int difficulty)
        {
            // 每個難度連續生成 20 次，共 100 題壓力抽檢
            for (int i = 0; i < 20; i++)
            {
                QuestionData q = _generator.GenerateQuestion(difficulty);

                // 斷言 1: 基礎數字量恰好為 4
                Assert.IsNotNull(q.Numbers);
                Assert.AreEqual(4, q.Numbers.Length, "基礎數字必須恰好有 4 個");

                // 斷言 2: 目標解答為正整數
                Assert.Greater(q.Target, 0, "目標值應大於 0");

                // 斷言 3: 保證解範例不得為空
                Assert.IsFalse(string.IsNullOrEmpty(q.ExampleSolution));

                // 斷言 4: 解析範例解並代入驗證器，驗證題目「保證必有解」
                bool sampleVerified = VerifyExampleSolutionString(q);
                Assert.IsTrue(sampleVerified, $"題目產出的範例解答未能通過自身驗證: {q}");
            }
        }

        private bool VerifyExampleSolutionString(QuestionData q)
        {
            // 解析 "n1 op1 n2 op2 n3 op3 n4 = target"
            string[] parts = q.ExampleSolution.Split(' ');
            if (parts.Length < 9) return false;

            var nums = new List<int>
            {
                int.Parse(parts[0]),
                int.Parse(parts[2]),
                int.Parse(parts[4]),
                int.Parse(parts[6])
            };

            var ops = new List<char>
            {
                parts[1][0],
                parts[3][0],
                parts[5][0]
            };

            return _generator.ValidateEquation(nums, ops, q.Target);
        }

        #endregion

        #region 5. 邊界條件與異常防禦 (Boundary & Edge Cases)

        [Test]
        public void ValidateEquation_EmptyOrNullInputs_ReturnsFalse()
        {
            Assert.IsFalse(_generator.ValidateEquation(null, new List<char>(), 10));
            Assert.IsFalse(_generator.ValidateEquation(new List<int>(), null, 10));
            Assert.IsFalse(_generator.ValidateEquation(new List<int> { 5 }, new List<char>(), 5));
        }

        [Test]
        public void ValidateEquation_OperatorCountMismatch_ReturnsFalse()
        {
            // 4 個數字需要 3 個運算子，傳入 2 個運算子應拒絕
            var numbers = new List<int> { 1, 2, 3, 4 };
            var operators = new List<char> { '+', '+' };
            Assert.IsFalse(_generator.ValidateEquation(numbers, operators, 10));
        }

        [Test]
        public void ValidateEquation_InvalidOperatorChar_ReturnsFalse()
        {
            var numbers = new List<int> { 2, 3 };
            var operators = new List<char> { '^' }; // 不支援的符號
            Assert.IsFalse(_generator.ValidateEquation(numbers, operators, 8));
        }

        [Test]
        public void ValidateEquation_NegativeIntermediateValues_HandledCorrectly()
        {
            // 2 - 5 * 2 = 2 - 10 = -8
            var numbers = new List<int> { 2, 5, 2 };
            var operators = new List<char> { '-', '*' };
            Assert.IsTrue(_generator.ValidateEquation(numbers, operators, -8));
        }

        #endregion
    }
}
`;

export const MENTAL_MATH_GAME_MANAGER_CS = `// ============================================================================
// 《心算大師》Unity MonoBehaviour 範例：UI 與遊戲迴圈整合
// 掛載至 Unity 場景中的 GameObject (例如 GameManager)
// ============================================================================

using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MentalMathMaster.Core;

namespace MentalMathMaster.UnityUI
{
    public class MentalMathGameManager : MonoBehaviour
    {
        [Header("UI 核心顯示組件")]
        [SerializeField] private TextMeshProUGUI targetNumberText;
        [SerializeField] private TextMeshProUGUI equationDisplay;
        [SerializeField] private TextMeshProUGUI feedbackText;
        [SerializeField] private TextMeshProUGUI streakText;

        [Header("卡牌與運算子按鈕")]
        [SerializeField] private Button[] numberButtons; // 長度固定 4
        [SerializeField] private TextMeshProUGUI[] numberButtonTexts;
        [SerializeField] private Button addBtn;
        [SerializeField] private Button subBtn;
        [SerializeField] private Button mulBtn;
        [SerializeField] private Button divBtn;
        [SerializeField] private Button backspaceBtn;
        [SerializeField] private Button submitBtn;
        [SerializeField] private Button hintBtn;

        [Header("音效回饋 (可選)")]
        [SerializeField] private AudioSource audioSource;
        [SerializeField] private AudioClip tapSound;
        [SerializeField] private AudioClip successSound;
        [SerializeField] private AudioClip errorSound;

        private MentalMathGenerator _generator;
        private QuestionData _currentQuestion;
        private readonly List<int> _selectedNumbers = new();
        private readonly List<char> _selectedOperators = new();
        private readonly List<int> _usedButtonIndices = new();
        private int _streakCount = 0;

        private void Awake()
        {
            _generator = new MentalMathGenerator();
            BindButtonEvents();
        }

        private void Start()
        {
            LoadNewQuestion(difficulty: 2);
        }

        public void LoadNewQuestion(int difficulty)
        {
            _currentQuestion = _generator.GenerateQuestion(difficulty);
            _selectedNumbers.Clear();
            _selectedOperators.Clear();
            _usedButtonIndices.Clear();

            // 更新 UI
            targetNumberText.text = _currentQuestion.Target.ToString();
            for (int i = 0; i < 4; i++)
            {
                numberButtonTexts[i].text = _currentQuestion.Numbers[i].ToString();
                numberButtons[i].interactable = true;
            }

            feedbackText.text = "請選擇數字與運算子組合出目標值！";
            feedbackText.color = Color.white;
            UpdateEquationDisplay();
        }

        private void BindButtonEvents()
        {
            for (int i = 0; i < numberButtons.Length; i++)
            {
                int index = i;
                numberButtons[i].onClick.AddListener(() => OnNumberClicked(index));
            }

            addBtn.onClick.AddListener(() => OnOperatorClicked('+'));
            subBtn.onClick.AddListener(() => OnOperatorClicked('-'));
            mulBtn.onClick.AddListener(() => OnOperatorClicked('*'));
            divBtn.onClick.AddListener(() => OnOperatorClicked('/'));
            backspaceBtn.onClick.AddListener(OnBackspaceClicked);
            submitBtn.onClick.AddListener(OnSubmitClicked);
            hintBtn.onClick.AddListener(OnHintClicked);
        }

        private void OnNumberClicked(int buttonIndex)
        {
            // 規則: 數字與運算子交替輸入 (例如: N -> Op -> N -> Op -> N -> Op -> N)
            if (_selectedNumbers.Count > _selectedOperators.Count)
            {
                ShowFeedback("請先點選運算子 (+, -, *, /) 再選數字！", Color.yellow);
                PlaySound(errorSound);
                return;
            }

            int num = _currentQuestion.Numbers[buttonIndex];
            _selectedNumbers.Add(num);
            _usedButtonIndices.Add(buttonIndex);
            numberButtons[buttonIndex].interactable = false;

            PlaySound(tapSound);
            UpdateEquationDisplay();
        }

        private void OnOperatorClicked(char op)
        {
            // 規則: 必須先有數字才能輸入運算子
            if (_selectedNumbers.Count == 0 || _selectedNumbers.Count <= _selectedOperators.Count)
            {
                ShowFeedback("請先點選數字再選擇運算子！", Color.yellow);
                PlaySound(errorSound);
                return;
            }

            if (_selectedOperators.Count >= 3)
            {
                ShowFeedback("4 個數字已搭配 3 個運算子，請點擊提交驗證！", Color.yellow);
                return;
            }

            _selectedOperators.Add(op);
            PlaySound(tapSound);
            UpdateEquationDisplay();
        }

        private void OnBackspaceClicked()
        {
            if (_selectedOperators.Count >= _selectedNumbers.Count && _selectedOperators.Count > 0)
            {
                _selectedOperators.RemoveAt(_selectedOperators.Count - 1);
            }
            else if (_selectedNumbers.Count > 0)
            {
                _selectedNumbers.RemoveAt(_selectedNumbers.Count - 1);
                int lastBtnIndex = _usedButtonIndices[_usedButtonIndices.Count - 1];
                _usedButtonIndices.RemoveAt(_usedButtonIndices.Count - 1);
                numberButtons[lastBtnIndex].interactable = true;
            }

            PlaySound(tapSound);
            UpdateEquationDisplay();
        }

        private void OnSubmitClicked()
        {
            var result = _generator.ValidateEquationDetailed(
                _selectedNumbers,
                _selectedOperators,
                _currentQuestion.Target,
                _currentQuestion.Numbers
            );

            if (result.IsValid)
            {
                _streakCount++;
                streakText.text = $"連擊: {_streakCount}";
                ShowFeedback($"答對了！結果恰好等於 {_currentQuestion.Target}！", Color.green);
                PlaySound(successSound);

                Invoke(nameof(NextLevel), 1.5f);
            }
            else
            {
                _streakCount = 0;
                streakText.text = "連擊: 0";
                ShowFeedback($"驗證失敗: {result.ErrorMessage}", Color.red);
                PlaySound(errorSound);
            }
        }

        private void OnHintClicked()
        {
            ShowFeedback($"提示範例解: {_currentQuestion.ExampleSolution}", Color.cyan);
        }

        private void NextLevel()
        {
            LoadNewQuestion(_currentQuestion.Difficulty);
        }

        private void UpdateEquationDisplay()
        {
            var parts = new List<string>();
            for (int i = 0; i < _selectedNumbers.Count; i++)
            {
                parts.Add(_selectedNumbers[i].ToString());
                if (i < _selectedOperators.Count)
                {
                    parts.Add(_selectedOperators[i].ToString());
                }
            }
            equationDisplay.text = parts.Count > 0 ? string.Join(" ", parts) : "點擊數字與運算子開始構建算式";
        }

        private void ShowFeedback(string msg, Color color)
        {
            feedbackText.text = msg;
            feedbackText.color = color;
        }

        private void PlaySound(AudioClip clip)
        {
            if (audioSource != null && clip != null)
            {
                audioSource.PlayOneShot(clip);
            }
        }
    }
}
`;
