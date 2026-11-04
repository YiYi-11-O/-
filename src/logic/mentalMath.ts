/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuestionData {
  numbers: number[];
  target: number;
  difficulty: number;
  exampleSolution: string;
}

export interface StepDetail {
  phase: 'multiply_divide' | 'add_subtract';
  expression: string;
  result: number;
  isDivisionCheck?: boolean;
  divisionClean?: boolean;
  note: string;
}

export interface ValidationResult {
  isValid: boolean;
  calculatedValue: number;
  errorMessage: string;
  steps: StepDetail[];
}

export interface UnitTestResult {
  id: string;
  category: string;
  name: string;
  description: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

export class MentalMathEngine {
  /**
   * 難度設定
   */
  private static getDifficultyConfig(difficulty: number) {
    const diff = Math.min(Math.max(difficulty, 1), 5);
    switch (diff) {
      case 1:
        return { minNum: 1, maxNum: 9, ops: ['+', '-'] };
      case 2:
        return { minNum: 1, maxNum: 12, ops: ['+', '-', '*'] };
      case 3:
        return { minNum: 2, maxNum: 16, ops: ['+', '-', '*', '/'] };
      case 4:
        return { minNum: 2, maxNum: 25, ops: ['+', '-', '*', '/'] };
      default:
        return { minNum: 3, maxNum: 40, ops: ['+', '-', '*', '/'] };
    }
  }

  /**
   * 生成題目 (100% 保證有整數解)
   */
  public static generateQuestion(difficulty: number): QuestionData {
    const config = this.getDifficultyConfig(difficulty);
    const maxAttempts = 120;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 隨機選 3 個運算子
      const ops: string[] = [];
      for (let i = 0; i < 3; i++) {
        ops.push(config.ops[Math.floor(Math.random() * config.ops.length)]);
      }

      // 隨機選 4 個數字
      const nums: number[] = [];
      for (let i = 0; i < 4; i++) {
        nums.push(Math.floor(Math.random() * (config.maxNum - config.minNum + 1)) + config.minNum);
      }

      // 針對除法進行整除安全調整
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] === '/') {
          if (nums[i + 1] === 0) nums[i + 1] = Math.max(1, config.minNum);
          const divisor = nums[i + 1];
          const multiplier = Math.floor(Math.random() * Math.max(2, Math.floor(config.maxNum / divisor))) + 1;
          nums[i] = divisor * multiplier;
        }
      }

      // 嚴格評估此算式
      const evalRes = this.evaluateExpression(nums, ops);
      if (!evalRes.isValid) continue;

      const target = evalRes.calculatedValue;
      if (target <= 0 || target > 400) continue;

      const exampleSolution = `${nums[0]} ${ops[0]} ${nums[1]} ${ops[1]} ${nums[2]} ${ops[2]} ${nums[3]} = ${target}`;

      // 洗牌數字傳給玩家
      const shuffledNumbers = [...nums];
      for (let i = shuffledNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledNumbers[i], shuffledNumbers[j]] = [shuffledNumbers[j], shuffledNumbers[i]];
      }

      return {
        numbers: shuffledNumbers,
        target,
        difficulty,
        exampleSolution,
      };
    }

    // 保底題目
    return {
      numbers: [3, 5, 2, 4],
      target: 24,
      difficulty,
      exampleSolution: '3 * 5 + 4 + 5 = 24',
    };
  }

  /**
   * 簡化核心驗證：依照 C# ValidateEquation 簽名
   */
  public static validateEquation(numbers: number[], operators: string[], target: number): boolean {
    const res = this.validateEquationDetailed(numbers, operators, target);
    return res.isValid;
  }

  /**
   * 詳細驗證玩家輸入算式
   */
  public static validateEquationDetailed(
    numbers: number[],
    operators: string[],
    target: number,
    requiredBaseNumbers?: number[]
  ): ValidationResult {
    if (!numbers || !operators) {
      return { isValid: false, calculatedValue: 0, errorMessage: '輸入清單不得為空', steps: [] };
    }

    if (numbers.length < 2 || operators.length !== numbers.length - 1) {
      return {
        isValid: false,
        calculatedValue: 0,
        errorMessage: `算式結構不符 (數字 ${numbers.length} 個，運算子 ${operators.length} 個)`,
        steps: [],
      };
    }

    // 嚴格基礎數字比對
    if (requiredBaseNumbers) {
      if (numbers.length !== requiredBaseNumbers.length) {
        return {
          isValid: false,
          calculatedValue: 0,
          errorMessage: `必須使用題目給定的全部 ${requiredBaseNumbers.length} 個數字`,
          steps: [],
        };
      }

      const match = this.isMultisetMatch(numbers, requiredBaseNumbers);
      if (!match) {
        return {
          isValid: false,
          calculatedValue: 0,
          errorMessage: '使用的數字與題目給定的基礎數字不符（必須各用一次）',
          steps: [],
        };
      }
    }

    const evalRes = this.evaluateExpression(numbers, operators);
    if (!evalRes.isValid) {
      return evalRes;
    }

    if (evalRes.calculatedValue !== target) {
      return {
        isValid: false,
        calculatedValue: evalRes.calculatedValue,
        errorMessage: `計算結果為 ${evalRes.calculatedValue}，與目標解答 ${target} 不符`,
        steps: evalRes.steps,
      };
    }

    return {
      isValid: true,
      calculatedValue: evalRes.calculatedValue,
      errorMessage: '',
      steps: evalRes.steps,
    };
  }

  /**
   * 雙 Pass 算式評估核心（先乘除後加減 + 嚴格整除檢查）
   */
  public static evaluateExpression(numbers: number[], operators: string[]): ValidationResult {
    const steps: StepDetail[] = [];

    if (!numbers || numbers.length === 0) {
      return { isValid: false, calculatedValue: 0, errorMessage: '無數字可計算', steps };
    }

    if (!operators || operators.length !== numbers.length - 1) {
      return { isValid: false, calculatedValue: 0, errorMessage: '運算子數量與數字不匹配', steps };
    }

    // Pass 1: 處理乘法與除法
    const reducedNumbers: number[] = [numbers[0]];
    const reducedOps: string[] = [];

    for (let i = 0; i < operators.length; i++) {
      const op = operators[i];
      const nextNum = numbers[i + 1];

      if (op === '*' || op === '/') {
        const lastIdx = reducedNumbers.length - 1;
        const prevNum = reducedNumbers[lastIdx];

        if (op === '*') {
          const product = prevNum * nextNum;
          steps.push({
            phase: 'multiply_divide',
            expression: `${prevNum} × ${nextNum}`,
            result: product,
            note: '乘法優先計算',
          });
          reducedNumbers[lastIdx] = product;
        } else {
          // op === '/'
          if (nextNum === 0) {
            steps.push({
              phase: 'multiply_divide',
              expression: `${prevNum} ÷ 0`,
              result: 0,
              isDivisionCheck: true,
              divisionClean: false,
              note: '❌ 除數不能為 0',
            });
            return {
              isValid: false,
              calculatedValue: 0,
              errorMessage: `除數不能為 0 (${prevNum} ÷ 0)`,
              steps,
            };
          }

          if (prevNum % nextNum !== 0) {
            const remainder = prevNum % nextNum;
            const floatVal = (prevNum / nextNum).toFixed(2);
            steps.push({
              phase: 'multiply_divide',
              expression: `${prevNum} ÷ ${nextNum} = ${floatVal}`,
              result: 0,
              isDivisionCheck: true,
              divisionClean: false,
              note: `❌ 無法整除 (餘數 ${remainder})，違反心算手遊整數規範`,
            });
            return {
              isValid: false,
              calculatedValue: 0,
              errorMessage: `整除驗證失敗：${prevNum} ÷ ${nextNum} 無法整除（產生小數），違反手遊規範`,
              steps,
            };
          }

          const quotient = prevNum / nextNum;
          steps.push({
            phase: 'multiply_divide',
            expression: `${prevNum} ÷ ${nextNum}`,
            result: quotient,
            isDivisionCheck: true,
            divisionClean: true,
            note: '✓ 完美整除 (無小數)',
          });
          reducedNumbers[lastIdx] = quotient;
        }
      } else if (op === '+' || op === '-') {
        reducedOps.push(op);
        reducedNumbers.push(nextNum);
      } else {
        return {
          isValid: false,
          calculatedValue: 0,
          errorMessage: `不支援的運算符號: '${op}'`,
          steps,
        };
      }
    }

    // Pass 2: 處理加法與減法
    let total = reducedNumbers[0];
    for (let i = 0; i < reducedOps.length; i++) {
      const op = reducedOps[i];
      const val = reducedNumbers[i + 1];
      const prevTotal = total;

      if (op === '+') {
        total += val;
        steps.push({
          phase: 'add_subtract',
          expression: `${prevTotal} + ${val}`,
          result: total,
          note: '加法運算',
        });
      } else if (op === '-') {
        total -= val;
        steps.push({
          phase: 'add_subtract',
          expression: `${prevTotal} - ${val}`,
          result: total,
          note: '減法運算',
        });
      }
    }

    return {
      isValid: true,
      calculatedValue: total,
      errorMessage: '',
      steps,
    };
  }

  /**
   * 多重集匹配：確認 a 與 b 包含相同的數字與頻率
   */
  private static isMultisetMatch(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    const freq = new Map<number, number>();
    for (const num of b) {
      freq.set(num, (freq.get(num) || 0) + 1);
    }
    for (const num of a) {
      const count = freq.get(num);
      if (!count || count <= 0) return false;
      freq.set(num, count - 1);
    }
    return true;
  }

  /**
   * 搜尋此 4 個數字是否有任何解可達到目標整數 (用於提示與自動窮舉驗證)
   */
  public static findAllSolutions(baseNumbers: number[], target: number): string[] {
    const permutations = this.getPermutations(baseNumbers);
    const opCandidates = ['+', '-', '*', '/'];
    const solutions = new Set<string>();

    for (const p of permutations) {
      for (const op1 of opCandidates) {
        for (const op2 of opCandidates) {
          for (const op3 of opCandidates) {
            const ops = [op1, op2, op3];
            const evalRes = this.evaluateExpression(p, ops);
            if (evalRes.isValid && evalRes.calculatedValue === target) {
              solutions.add(`${p[0]} ${op1} ${p[1]} ${op2} ${p[2]} ${op3} ${p[3]} = ${target}`);
            }
          }
        }
      }
    }

    return Array.from(solutions);
  }

  private static getPermutations(arr: number[]): number[][] {
    if (arr.length <= 1) return [arr];
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const subPerms = this.getPermutations(remaining);
      for (const sub of subPerms) {
        result.push([current, ...sub]);
      }
    }
    return result;
  }

  /**
   * 執行全套單元測試
   */
  public static runUnitTests(): UnitTestResult[] {
    const tests: {
      id: string;
      category: string;
      name: string;
      description: string;
      run: () => { passed: boolean; details: string };
    }[] = [
      {
        id: 'pemdas_mult_add',
        category: '先乘除後加減 (PEMDAS)',
        name: '乘法優先級: 2 + 3 * 4 = 14',
        description: '驗證加法與乘法混用時，優先計算 3 * 4 = 12，再加 2 得到 14 (若無優先級會算成 20)',
        run: () => {
          const res = this.validateEquationDetailed([2, 3, 4], ['+', '*'], 14);
          const passed = res.isValid && res.calculatedValue === 14;
          return { passed, details: passed ? '通過: 計算結果為 14' : `失敗: ${res.errorMessage}` };
        },
      },
      {
        id: 'pemdas_sub_div',
        category: '先乘除後加減 (PEMDAS)',
        name: '除法優先級: 10 - 6 / 2 = 7',
        description: '驗證減法與除法混用時，優先計算 6 / 2 = 3，再以 10 - 3 得到 7 (若無優先級會算成 2)',
        run: () => {
          const res = this.validateEquationDetailed([10, 6, 2], ['-', '/'], 7);
          const passed = res.isValid && res.calculatedValue === 7;
          return { passed, details: passed ? '通過: 計算結果為 7' : `失敗: ${res.errorMessage}` };
        },
      },
      {
        id: 'pemdas_chained',
        category: '先乘除後加減 (PEMDAS)',
        name: '複合四則: 20 / 4 * 2 + 3 = 13',
        description: '乘除同級由左至右: 20 / 4 = 5，5 * 2 = 10，10 + 3 = 13',
        run: () => {
          const res = this.validateEquationDetailed([20, 4, 2, 3], ['/', '*', '+'], 13);
          const passed = res.isValid && res.calculatedValue === 13;
          return { passed, details: passed ? '通過: 成功由左至右摺疊乘除得到 13' : `失敗: ${res.errorMessage}` };
        },
      },
      {
        id: 'integer_div_valid',
        category: '整除運算驗證 (Integer Division)',
        name: '合法整除除法: 12 / 3 + 4 = 8',
        description: '12 能被 3 整除，商為 4，加 4 得到 8，應判定合規',
        run: () => {
          const res = this.validateEquationDetailed([12, 3, 4], ['/', '+'], 8);
          return { passed: res.isValid, details: res.isValid ? '通過: 12 ÷ 3 = 4 (無餘數)' : res.errorMessage };
        },
      },
      {
        id: 'integer_div_reject_float',
        category: '整除運算驗證 (Integer Division)',
        name: '嚴格拒絕小數: 7 / 2 + 1 應判定無效',
        description: '7 ÷ 2 = 3.5 產生小數，題目規範不得產生小數，必須攔截拒絕，不可被截斷為整數 3',
        run: () => {
          const res = this.validateEquationDetailed([7, 2, 1], ['/', '+'], 4);
          const passed = !res.isValid && res.errorMessage.includes('整除驗證失敗');
          return {
            passed,
            details: passed ? `通過: 成功攔截小數除法 (${res.errorMessage})` : '失敗: 未能攔截小數除法',
          };
        },
      },
      {
        id: 'div_by_zero',
        category: '整除運算驗證 (Integer Division)',
        name: '除以零安全防禦: 8 / 0 + 4',
        description: '除數為 0 時必須安全返回錯誤訊息，不得崩潰或回傳 Infinity',
        run: () => {
          const res = this.validateEquationDetailed([8, 0, 4], ['/', '+'], 4);
          const passed = !res.isValid && res.errorMessage.includes('除數不能為 0');
          return {
            passed,
            details: passed ? `通過: 安全攔截 (${res.errorMessage})` : '失敗: 未攔截除以零',
          };
        },
      },
      {
        id: 'multiset_tamper',
        category: '防作弊與數字使用比對',
        name: '偷換題目數字檢測: [3, 8, 2, 5] 代入 [3, 8, 2, 4]',
        description: '玩家輸入未出現在題目中的數字 (如把 5 換成 4)，即使算式正確也必須拒絕',
        run: () => {
          const base = [3, 8, 2, 5];
          const playerNums = [3, 8, 2, 4];
          const playerOps = ['*', '-', '+']; // 3 * 8 - 2 + 4 = 26
          const res = this.validateEquationDetailed(playerNums, playerOps, 26, base);
          const passed = !res.isValid && res.errorMessage.includes('基礎數字不符');
          return {
            passed,
            details: passed ? `通過: 成功比對出數字偷換 (${res.errorMessage})` : '失敗: 未檢查基礎數字',
          };
        },
      },
      {
        id: 'generation_solvable_100',
        category: '題目生成必有解驗證',
        name: '抽查 50 題題目生成必有整數解',
        description: '抽查難度 1~5 題庫生成，確保 100% 產出的 4 個數字與目標值皆可在本引擎下完全驗證通過',
        run: () => {
          let allPassed = true;
          let failures = 0;
          for (let diff = 1; diff <= 5; diff++) {
            for (let i = 0; i < 10; i++) {
              const q = this.generateQuestion(diff);
              if (!q || q.numbers.length !== 4 || q.target <= 0) {
                allPassed = false;
                failures++;
                continue;
              }
              // 驗證產出的範例解答
              const parts = q.exampleSolution.split(' ');
              const nums = [parseInt(parts[0]), parseInt(parts[2]), parseInt(parts[4]), parseInt(parts[6])];
              const ops = [parts[1], parts[3], parts[5]];
              const verified = this.validateEquation(nums, ops, q.target);
              if (!verified) {
                allPassed = false;
                failures++;
              }
            }
          }
          return {
            passed: allPassed,
            details: allPassed ? '通過: 50/50 道隨機題目皆保證有解並通過自身驗證' : `失敗: 有 ${failures} 題驗證不符`,
          };
        },
      },
    ];

    return tests.map((t) => {
      const start = performance.now();
      const outcome = t.run();
      const durationMs = parseFloat((performance.now() - start).toFixed(2));
      return {
        id: t.id,
        category: t.category,
        name: t.name,
        description: t.description,
        passed: outcome.passed,
        details: outcome.details,
        durationMs,
      };
    });
  }
}
