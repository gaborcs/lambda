import primitiveFunctions from './primitiveFunctions';

export default expressions => {
    let evalWithEnv = env => node => {
        let { type, value } = node;
        let children = node.children || [];

        let applyArgs = (f, args) => {
            let reducer = (acc, currentArg) => {
                let evaluatedArg = evalWithEnv(env)(currentArg);
                return acc(evaluatedArg);
            };
            return args.reduce(reducer, f);
        }

        switch (type) {
            case 'number':
                return value;
            case 'primitive':
                return primitiveFunctions[value].apply(evalNode, children);
            case 'expression':
                let expression = evalWithEnv(env)(expressions[value]);
                return applyArgs(expression, children);
            case 'lambda':
                let [ body, ...args ] = children;
                let f = evaluatedArg => evalWithEnv({
                    ...env,
                    [value]: evaluatedArg
                })(body);
                return applyArgs(f, args);
            case 'variable':
                return env[value];
            default:
                return NaN;
        }
    };
    let evalNode = evalWithEnv({});
    return evalNode;
};