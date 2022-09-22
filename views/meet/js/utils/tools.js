const tools = {}
/***
 * 复制文本
 * @param copyNode
 */
tools.copyHandle=function(copyNode) {
    const selection = window.getSelection();
    const range = document.createRange();
    if (selection.rangeCount > 0) selection.removeAllRanges();
    // 使 Range 包含某个节点及其内容
    range.selectNode(copyNode);
    // 向选区（Selection）中添加一个区域（Range）
    selection.addRange(range);
    // 执行浏览器复制命令
    document.execCommand("copy");
}
tools.doubleNumber=function(num) {
    if (num < 10) {
        return '0' + num
    } else {
        return num
    }
}