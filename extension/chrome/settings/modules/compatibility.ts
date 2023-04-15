/* ©️ 2016 - present FlowCrypt a.s. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { Buf } from '../../../js/common/core/buf.js';
import { Ui } from '../../../js/common/browser/ui.js';
import { View } from '../../../js/common/view.js';
import { Xss } from '../../../js/common/platform/xss.js';
import { KeyUtil, Key } from '../../../js/common/core/crypto/key.js';
import { Api } from '../../../js/common/api/shared/api.js';

View.run(
  class CompatibilityView extends View {
    private testIndex = 0;

    public constructor() {
      super();
    }

    public render = async () => {
      // No need
    };

    public setHandlers = () => {
      $('.action_test_key').on('click', this.setHandlerPrevent('double', this.actionTestKeyHandler));
      $('.action_load_public_key').on('click', this.setHandlerPrevent('double', this.actionLoadPublicKey))
      $('#input_passphrase').keydown(this.setEnterHandlerThatClicks('.action_test_key'));
    };

    private performKeyCompatibilityTests = async (keyString: string) => {
      $('pre').text('').css('display', 'block');
      try {
        this.testIndex = 1;
        const { keys, errs } = await KeyUtil.readMany(Buf.fromUtfStr(keyString));
        for (const err of errs) {
          this.appendResult(`Error parsing input: ${String(err)}`);
        }
        await this.outputKeyResults(keys);
      } catch (err) {
        this.appendResult(`Exception: ${String(err)}`);
      }
    };

    private appendResult = (str: string, err?: Error) => {
      Xss.sanitizeAppend('pre', `(${Xss.escape(`${this.testIndex++}`)}) ${Xss.escape(str)} ${err ? Xss.escape(` !! ${err.message}`) : Xss.escape('')} \n`);
    };

    private outputKeyResults = async (keys: Key[]) => {
      this.appendResult(`Primary keys found: ${keys.length}`);
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
        this.appendResult(`----- Testing key ${keyIndex} -----`);
        const key = keys[keyIndex];
        const kn = `PK ${keyIndex} >`;
        const results = await KeyUtil.diagnose(key, String($('.input_passphrase').val()));
        for (const entry of results) {
          this.appendResult(`${kn} ${entry[0]}: ${entry[1]}`);
        }
      }
    };

    private actionLoadPublicKey = async () => {
      const keyid_or_email = String($('.input_keyid_or_email').val());
      const buf = await Api.download(`https://flowcrypt.com/attester/pub/${keyid_or_email}`);
      const publicKey = buf.toUtfStr();
      $('.input_key').val(publicKey);
    };

    private actionTestKeyHandler = async (submitBtn: HTMLElement) => {
      const keyString = String($('.input_key').val());
      if (!keyString) {
        await Ui.modal.warning('Please paste an OpenPGP in the input box');
        return;
      }
      const origBtnContent = $(submitBtn).html();
      Xss.sanitizeRender(submitBtn, 'Evaluating.. ' + Ui.spinner('white'));
      await this.performKeyCompatibilityTests(keyString);
      Xss.sanitizeRender(submitBtn, origBtnContent);
    };
  }
);
