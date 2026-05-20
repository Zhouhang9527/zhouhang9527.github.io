#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将台词文本文件转换为 voice-config.json 格式
输入格式：文件名.wav[TAB]繁体中文[TAB]日语
输出格式：JSON 配置文件
"""

import json
import os
import re

def convert_to_voice_config(input_file, output_file):
    """转换台词文件为 voice-config.json"""
    
    # 分类规则（根据文件名前缀）
    categories = {
        'welcome': [],  # 欢迎语（首次见面、问候）
        'click': [],    # 点击反应（短句、惊讶）
        'hover': [],    # 悬停反应（疑问、思考）
        'talk': [],     # 对话（日常交流）
        'special': []   # 特殊事件（剧情、情绪）
    }
    
    # 读取输入文件
    with open(input_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            parts = line.split('\t')
            if len(parts) != 3:
                print(f"警告: 第 {line_num} 行格式不正确，跳过")
                continue
            
            filename, zh_text, ja_text = parts
            
            # 将 .wav 替换为 .opus
            opus_filename = filename.replace('.wav', '.opus')
            
            # 创建语音条目
            entry = {
                "text": zh_text,
                "file": opus_filename,
                "ja": ja_text
            }
            
            # 智能分类规则
            chapter = re.match(r'ATR_(b\d+)_', filename)
            if not chapter:
                categories['special'].append(entry)
                continue
            
            chapter_id = chapter.group(1)
            text_len = len(zh_text)
            
            # 欢迎语：b999开头（序章）或包含问候的短句
            if chapter_id == 'b999':
                categories['welcome'].append(entry)
            # 点击反应：短句（< 15字）且包含语气词或感叹
            elif text_len < 15 and any(w in zh_text for w in ['！', '？', '……', '呜', '哎', '嗯', '啊', '哇']):
                categories['click'].append(entry)
            # 悬停反应：包含疑问的短中句（15-30字）
            elif 15 <= text_len < 30 and ('？' in zh_text or '吗' in zh_text or '呢' in zh_text):
                categories['hover'].append(entry)
            # 对话：日常交流（b1xx, b2xx章节，中等长度）
            elif chapter_id.startswith('b1') or chapter_id.startswith('b2'):
                if text_len < 50:
                    categories['talk'].append(entry)
                else:
                    categories['special'].append(entry)
            # 特殊：剧情相关或长句
            else:
                categories['special'].append(entry)
    
    # 构建配置对象
    config = {
        "categories": categories,
        "basePath": "/voice/atri/",
        "volume": 0.7,
        "enabled": True
    }
    
    # 写入输出文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=4)
    
    # 统计信息
    total = sum(len(v) for v in categories.values())
    print(f"转换完成！")
    print(f"总计: {total} 条语音")
    print(f"  - 欢迎语: {len(categories['welcome'])}")
    print(f"  - 点击: {len(categories['click'])}")
    print(f"  - 悬停: {len(categories['hover'])}")
    print(f"  - 对话: {len(categories['talk'])}")
    print(f"  - 特殊: {len(categories['special'])}")
    print(f"输出文件: {output_file}")

if __name__ == '__main__':
    input_file = '亚托莉台词多语言.txt'
    output_file = 'source/voice-config.json'
    
    if not os.path.exists(input_file):
        print(f"错误: 找不到输入文件 {input_file}")
        exit(1)
    
    convert_to_voice_config(input_file, output_file)
