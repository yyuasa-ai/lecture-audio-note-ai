/**
 * 講義音声ノートAI - メインスクリプト
 * 
 * このファイルは、画面の操作（ボタンを押した時の動き、ファイルの選択、
 * APIキーの保存など）や、AI解析（今回はダミーデータ）の処理を担当します。
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. 画面の要素（HTMLパーツ）を取得する
    // -------------------------------------------------------------
    // APIキー関連
    const apiKeyInput = document.getElementById('api-key');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const deleteApiKeyBtn = document.getElementById('delete-api-key-btn');
    const apiStatusMsg = document.getElementById('api-status-msg');

    // 解析の入力・操作関連
    const lectureNameInput = document.getElementById('lecture-name');
    const audioFileInput = document.getElementById('audio-file');
    const dropZone = document.getElementById('drop-zone');
    const fileInfoBadge = document.getElementById('file-info-badge');
    const selectedFileName = document.getElementById('selected-file-name');
    const analyzeBtn = document.getElementById('analyze-btn');
    const btnLoader = document.getElementById('btn-loader');
    const btnText = analyzeBtn.querySelector('.btn-text');

    // エラー表示関連
    const errorContainer = document.getElementById('error-container');
    const errorText = document.getElementById('error-text');

    // 解析結果関連
    const resultSection = document.getElementById('result-section');
    const resultTitleText = document.getElementById('result-title-text');
    const transcriptContent = document.getElementById('transcript-content');
    const summaryContent = document.getElementById('summary-content');
    const pointsContent = document.getElementById('points-content');
    const copyButtons = document.querySelectorAll('.btn-copy');

    // 接続テスト関連
    const testApiBtn = document.getElementById('test-api-btn');
    const testLoader = document.getElementById('test-loader');
    const testResultBox = document.getElementById('test-result-box');
    const testResultStatus = document.getElementById('test-result-status');
    const testResultResponse = document.getElementById('test-result-response');

    // -------------------------------------------------------------
    // 2. 初期設定（アプリが起動した時の処理）
    // -------------------------------------------------------------
    // ブラウザの保存庫（localStorage）から保存されているAPIキーを読み込む
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        showApiStatus('APIキーが保存されています', 'success');
    } else {
        showApiStatus('APIキーが設定されていません', 'error');
    }

    // -------------------------------------------------------------
    // 3. APIキー設定の処理
    // -------------------------------------------------------------
    // APIキーの表示・非表示を切り替える（目のアイコン）
    toggleApiKeyBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiKeyBtn.textContent = '🙈'; // 非表示用のアイコンに変更
        } else {
            apiKeyInput.type = 'password';
            toggleApiKeyBtn.textContent = '👁️'; // 表示用のアイコンに変更
        }
    });

    // 「キーを保存する」ボタンを押した時
    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key === '') {
            showApiStatus('キーを入力してください', 'error');
            showError('APIキーが入力されていないため、保存できません。');
            return;
        }
        // localStorageに「gemini_api_key」という名前で保存
        localStorage.setItem('gemini_api_key', key);
        showApiStatus('APIキーを保存しました！', 'success');
        hideError(); // エラーが出ていれば消す
    });

    // 「キーを削除する」ボタンを押した時
    deleteApiKeyBtn.addEventListener('click', () => {
        localStorage.removeItem('gemini_api_key');
        apiKeyInput.value = '';
        showApiStatus('APIキーを削除しました', 'error');
        hideError();
    });

    // APIキーのステータス表示を更新する関数
    function showApiStatus(message, type) {
        apiStatusMsg.textContent = message;
        apiStatusMsg.className = 'status-indicator ' + type;
    }

    // -------------------------------------------------------------
    // 3.5 API接続テストの処理
    // -------------------------------------------------------------
    testApiBtn.addEventListener('click', async () => {
        // 結果表示を一旦クリアして隠す
        testResultBox.className = 'test-result-box hidden';
        testResultStatus.textContent = '';
        testResultResponse.textContent = '';

        // 1. APIキーのチェック（入力欄の値、または保存されている値）
        const apiKey = apiKeyInput.value.trim() || localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            testResultBox.className = 'test-result-box error';
            testResultStatus.textContent = '❌ エラー';
            testResultResponse.textContent = 'APIキーを入力してください。';
            return;
        }

        // 2. ローディング（テスト中）の表示に切り替える
        testApiBtn.disabled = true;
        testLoader.classList.remove('hidden');
        testApiBtn.querySelector('.btn-text').textContent = '接続テスト中...';

        // リクエストを試みる関数
        async function tryRequest(version, model) {
            const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
            return await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'こんにちは。接続テストです。'
                        }]
                    }]
                })
            });
        }

        try {
            // パターン1: v1 (標準) + gemini-2.5-flash (2026年現在の安定標準モデル)
            let response = await tryRequest('v1', 'gemini-2.5-flash');
            let versionUsed = 'v1';
            let modelUsed = 'gemini-2.5-flash';

            // 404 (Not Found) になった場合、パターン2: v1beta + gemini-2.5-flash を試す
            if (response.status === 404) {
                response = await tryRequest('v1beta', 'gemini-2.5-flash');
                versionUsed = 'v1beta';
            }

            // それでも404の場合、パターン3: v1 + gemini-3.5-flash を試す
            if (response.status === 404) {
                response = await tryRequest('v1', 'gemini-3.5-flash');
                versionUsed = 'v1';
                modelUsed = 'gemini-3.5-flash';
            }

            // それでも404の場合、パターン4: v1beta + gemini-3.5-flash を試す
            if (response.status === 404) {
                response = await tryRequest('v1beta', 'gemini-3.5-flash');
                versionUsed = 'v1beta';
                modelUsed = 'gemini-3.5-flash';
            }

            // それでも404の場合、パターン5: v1 + gemini-1.5-flash を試す
            if (response.status === 404) {
                response = await tryRequest('v1', 'gemini-1.5-flash');
                versionUsed = 'v1';
                modelUsed = 'gemini-1.5-flash';
            }

            // それでも404の場合、パターン6: v1beta + gemini-1.5-flash を試す
            if (response.status === 404) {
                response = await tryRequest('v1beta', 'gemini-1.5-flash');
                versionUsed = 'v1beta';
                modelUsed = 'gemini-1.5-flash';
            }

            // 結果表示ボックスを見せる
            testResultBox.className = 'test-result-box';

            if (!response.ok) {
                // 4. API通信に失敗した場合（ステータスが200番台以外）
                const errorBody = await response.text();
                testResultBox.classList.add('error');
                testResultStatus.textContent = `❌ 接続失敗 (HTTPステータス: ${response.status})`;
                
                // 初心者向けにエラー原因のヒントと詳細を表示
                let errorMessage = `接続情報:\n- バージョン: ${versionUsed}\n- モデル: ${modelUsed}\n\n`;
                try {
                    const parsedError = JSON.parse(errorBody);
                    errorMessage += `エラー詳細:\n${JSON.stringify(parsedError, null, 2)}`;
                } catch {
                    errorMessage += `エラー詳細:\n${errorBody}`;
                }
                testResultResponse.textContent = errorMessage;
            } else {
                // 5. API通信に成功した場合
                const data = await response.json();
                
                // AIからの返答を取り出す
                const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AIからの応答テキストが見つかりませんでした。';
                
                // 成功したモデルとバージョンを記憶する
                localStorage.setItem('active_gemini_model', modelUsed);
                localStorage.setItem('active_gemini_version', versionUsed);

                testResultBox.classList.add('success');
                testResultStatus.textContent = `✅ 接続成功！ (モデル: ${modelUsed})`;
                testResultResponse.textContent = replyText;
            }
        } catch (error) {
            // 6. ネットワーク切断など、通信自体が失敗した場合
            testResultBox.className = 'test-result-box error';
            testResultStatus.textContent = '❌ 接続エラー';
            testResultResponse.textContent = `通信に失敗しました。インターネット接続を確認してください。\n詳細: ${error.message}`;
        } finally {
            // 7. ローディング表示を解除して元に戻す
            testApiBtn.disabled = false;
            testLoader.classList.add('hidden');
            testApiBtn.querySelector('.btn-text').textContent = '⚡ API接続テストを実行';
        }
    });

    // -------------------------------------------------------------
    // 4. 音声ファイル選択・ドラッグ＆ドロップの処理
    // -------------------------------------------------------------
    // ファイルが選択された時（クリックで選んだ場合）
    audioFileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files[0]);
    });

    // ドラッグしたファイルがエリアに入った時
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    // ドラッグしたファイルがエリアから外れた時
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    // ファイルをエリアにドロップした時
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            // input要素にドロップされたファイルをセットする
            audioFileInput.files = e.dataTransfer.files;
            handleFileSelection(file);
        }
    });

    // 選択されたファイルを画面に表示する関数
    function handleFileSelection(file) {
        if (!file) return;
        
        // ファイルの形式が音声（audio/*）かチェック
        if (!file.type.startsWith('audio/')) {
            showError('選択されたファイルは音声ファイルではありません。mp3やwavなどを選択してください。');
            audioFileInput.value = ''; // 選択をリセット
            fileInfoBadge.classList.add('hidden');
            return;
        }

        hideError(); // エラーを消す
        selectedFileName.textContent = `${file.name} (${formatFileSize(file.size)})`;
        fileInfoBadge.classList.remove('hidden');
    }

    // ファイルの容量（バイト）を分かりやすい表記（KB, MB）に変換する関数
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // -------------------------------------------------------------
    // 5. エラー表示のコントロール関数
    // -------------------------------------------------------------
    function showError(message) {
        errorText.textContent = message;
        errorContainer.classList.remove('hidden');
        // エラー位置までスムーズにスクロールする
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideError() {
        errorContainer.classList.add('hidden');
        errorText.textContent = '';
    }

    // -------------------------------------------------------------
    // 6. 音声解析の実行（API連携）
    // -------------------------------------------------------------
    // ファイルをBase64文字列に変換する関数
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // readAsDataURLは "data:audio/mp3;base64,XXXXXX..." という形式なので
                // カンマ以降の純粋なBase64データ部分のみを抽出する
                const base64Data = reader.result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = error => reject(error);
        });
    }

    analyzeBtn.addEventListener('click', async () => {
        // エラー表示を一旦リセット
        hideError();

        // 1. APIキーのチェック
        const apiKey = localStorage.getItem('gemini_api_key') || apiKeyInput.value.trim();
        if (!apiKey) {
            showError('Gemini APIキーが設定されていません。画面上の設定コーナーから保存してください。');
            return;
        }

        // 2. 音声ファイルのチェック
        if (audioFileInput.files.length === 0) {
            showError('解析する音声ファイルを選択してください。');
            return;
        }

        const file = audioFileInput.files[0];

        // 3. ローディング中（解析中）の表示に切り替える
        startLoading();

        try {
            // 4. 音声ファイルをBase64に変換
            const base64Audio = await fileToBase64(file);
            
            // 5. 接続テストで成功したモデルとバージョンを取得（なければデフォルトとして最新モデル）
            const version = localStorage.getItem('active_gemini_version') || 'v1';
            const model = localStorage.getItem('active_gemini_model') || 'gemini-2.5-flash';

            // 6. Gemini APIへの送信リクエスト
            // 6. Gemini APIへの送信リクエスト（JSON出力指示プロンプト）
            const promptText = `
提供された音声ファイルを注意深く聴き取り、以下の指示に従って「文字起こし」「3行要約」「要点（3〜5個）」を作成してください。

出力は必ず以下のJSON形式に従い、他の説明、前置き、挨拶、Markdownのコードブロック（\`\`\`json など）は一切出力しないでください。純粋なJSONテキストだけを返してください。

{
  "transcript": "音声の書き起こし全文（聞き取りづらい部分は推測するか、そのまま書き出してください。言葉のニュアンスを変えないこと）",
  "summary": [
    "音声の重要ポイントを簡潔にまとめた3行要約の1行目（必ず3項目にしてください）",
    "3行要約の2行目",
    "3行要約の3行目"
  ],
  "points": [
    "音声の要点や重要語句の解説・まとめ（3〜5項目）の1点目",
    "要点2点目",
    "要点3点目（最大5点まで）"
  ]
}
`.trim();

            const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: file.type || 'audio/mp3',
                                    data: base64Audio
                                }
                            },
                            {
                                text: promptText
                            }
                        ]
                    }]
                })
            });

            // ローディング状態を解除
            stopLoading();

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`API通信エラー: ${response.status}`, errorBody);
                showError(`AI解析に失敗しました。 (HTTPステータス: ${response.status})\nエラー詳細: ${errorBody}`);
                return;
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
                console.error('APIレスポンスの構造にデータがありませんでした:', data);
                showError('AIからの応答に解析結果テキストが含まれていませんでした。');
                return;
            }

            // 7. レスポンス（JSON）のパースとクレンジング処理
            let parsedResult;
            try {
                let cleanJsonText = rawText.trim();
                
                // Markdownのコードブロック（```json ... ```）の除去
                if (cleanJsonText.startsWith('```')) {
                    cleanJsonText = cleanJsonText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
                }
                
                // 最も外側の波括弧 { } の中身を抽出（前後に余計な解説が入っていた場合の対策）
                const start = cleanJsonText.indexOf('{');
                const end = cleanJsonText.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    cleanJsonText = cleanJsonText.substring(start, end + 1);
                }
                
                parsedResult = JSON.parse(cleanJsonText);
            } catch (e) {
                console.error('JSONパースに失敗しました。生テキスト:', rawText, e);
                showError(`AIからの回答データを正しく読み取れませんでした（JSON形式エラー）。もう一度お試しいただくか、プロンプトの調整をしてください。\n\n【AIの生応答の一部】:\n${rawText.substring(0, 200)}...`);
                return;
            }

            // 8. 講義名を取得（入力がなければ「名称未設定」とする）
            const lectureTitle = lectureNameInput.value.trim() || '名称未設定の講義';

            // 9. 画面の各エリアに結果を表示
            resultTitleText.textContent = lectureTitle;
            
            // 文字起こし
            transcriptContent.textContent = (parsedResult.transcript || '文字起こしデータが空です。').trim();

            // 3行要約 (配列を改行区切りで表示)
            if (Array.isArray(parsedResult.summary)) {
                summaryContent.innerHTML = parsedResult.summary.map((item, idx) => `${idx + 1}. ${item}`).join('<br>');
            } else {
                summaryContent.textContent = parsedResult.summary || '要約データが空です。';
            }

            // 要点 (配列を箇条書きで表示)
            if (Array.isArray(parsedResult.points)) {
                pointsContent.innerHTML = parsedResult.points.map(item => `・${item}`).join('<br>');
            } else {
                pointsContent.textContent = parsedResult.points || '要点データが空です。';
            }

            // 要約と要点エリアを表示する（hiddenクラスを取り除く）
            const resultBlocks = resultSection.querySelectorAll('.result-block');
            resultBlocks.forEach(block => {
                block.classList.remove('hidden'); // すべてのブロックを表示
            });

            // 結果エリアを表示する
            resultSection.classList.remove('hidden');
            
            // 結果エリアへスムーズにスクロール
            resultSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            stopLoading();
            console.error('例外エラーが発生しました:', error);
            showError(`解析中に例外エラーが発生しました。\n詳細: ${error.message}`);
        }
    });

    // 解析中の表示にする関数
    function startLoading() {
        analyzeBtn.disabled = true;
        btnText.textContent = 'AI解析を実行中...';
        btnLoader.classList.remove('hidden');
        resultSection.classList.add('hidden'); // 前回の結果があれば隠す
    }

    // 解析中の表示を解除する関数
    function stopLoading() {
        analyzeBtn.disabled = false;
        btnText.textContent = 'AI解析を実行する';
        btnLoader.classList.add('hidden');
    }

    // -------------------------------------------------------------
    // 7. コピー機能の処理
    // -------------------------------------------------------------
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // テキストの中身を取得（HTMLタグは除外してプレーンなテキストにする）
                let textToCopy = targetElement.innerText || targetElement.textContent;
                
                // クリップボードにテキストをコピーする
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        // コピーが成功した時の演出（ボタンの文字を一時的に変える）
                        const originalText = button.innerHTML;
                        button.innerHTML = '✅ コピー完了！';
                        button.classList.add('copied');
                        
                        // 2秒後に元の表示に戻す
                        setTimeout(() => {
                            button.innerHTML = originalText;
                            button.classList.remove('copied');
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('コピーに失敗しました: ', err);
                        alert('コピーに失敗しました。お使いのブラウザの設定を確認してください。');
                    });
            }
        });
    });
});
