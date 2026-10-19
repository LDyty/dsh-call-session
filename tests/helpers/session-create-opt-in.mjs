/**
 * 测试辅助：session_create 现在默认禁止，只有显式 allowSessionCreate=true 才可用。
 * 既有的创建链路测试通过本包装显式开启，默认拒绝策略另有专门用例覆盖。
 */

/**
 * 包装 executeSessionCreate，为测试调用注入 allowSessionCreate=true。
 *
 * @param {Function} rawExecute 原始 executeSessionCreate
 * @returns {Function} 自动开启 session_create 的包装函数
 */
export function withSessionCreateEnabled(rawExecute) {
  return function executeSessionCreate(...args) {
    const first = args[0];
    const objectForm = first !== null
      && typeof first === 'object'
      && Object.prototype.hasOwnProperty.call(first, 'ctx');

    if (objectForm) {
      const { options, ...rest } = first;
      const config = {
        allowSessionCreate: true,
        ...(first.config || {}),
        ...(options?.config || {})
      };
      return rawExecute({ ...rest, options: { ...(options || {}), config } });
    }

    const [ctx, rawArgs, rawExec, rawOptions] = args;
    return rawExecute(ctx, rawArgs, rawExec, {
      ...(rawOptions || {}),
      config: {
        allowSessionCreate: true,
        ...(rawOptions?.config || {})
      }
    });
  };
}
