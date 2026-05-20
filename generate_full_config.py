import json
import re

DIALOG_FILE = r'd:\GINKA-Blog\atri_dialogs.txt'
REPO_TREE = r'd:\GINKA-Blog\repo_tree.json'
RECOVERED_DIR = r'd:\atri-voice-data\voice'
OUTPUT_CONFIG = r'd:\GINKA-Blog\source\voice-config.json'

def get_valid_files():
    valid_files = set()
    
    # 1. GitHub Repo Files
    try:
        import os
        if os.path.exists(REPO_TREE):
            with open(REPO_TREE, 'r', encoding='utf-8') as f:
                tree_data = json.load(f)
                if 'tree' in tree_data:
                    for node in tree_data['tree']:
                        path = node.get('path', '')
                        if path.startswith('voice/'):
                            valid_files.add(path.split('/')[-1])
    except Exception as e:
        print(f"Error reading repo tree: {e}")

    # 2. Local Files (Recovered)
    try:
        import os
        if os.path.exists(RECOVERED_DIR):
            for f in os.listdir(RECOVERED_DIR):
                if f.endswith('.opus') or f.endswith('.wav'):
                    valid_files.add(f)
    except Exception as e:
        print(f"Error reading recovered dir: {e}")

    print(f"Total valid voice files: {len(valid_files)}")
    return valid_files

def parse_dialogs(valid_files):
    entries = []
    
    try:
        with open(DIALOG_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or not line.startswith('ATR_'):
                    continue
                
                parts = re.split(r'\s{2,}|\t+', line)
                if len(parts) >= 2:
                    fname = parts[0]
                    if fname.endswith('.wav'):
                        fname = fname.replace('.wav', '.opus')
                    
                    if fname not in valid_files:
                        continue
                        
                    ja = parts[1]
                    zh = parts[2] if len(parts) > 2 else ""
                    
                    entries.append({
                        'file': fname,
                        'ja': ja,
                        'text': zh if zh else ja
                    })
    except Exception as e:
        print(f"Error parsing dialogs: {e}")
        
    print(f"Parsed {len(entries)} valid dialog entries.")
    return entries

def categorize_entries(entries):
    categories = {
        'welcome': [], # 欢迎/问候
        'click': [],   # 普通点击/疑问
        'talk': [],    # 闲聊/剧情/长句
        'happy': [],   # 开心/撒娇/喜欢/点赞
        'angry': [],   # 生气/傲娇/警告/点踩
        'morning': [], # 早安
        'night': []    # 晚安
    }
    
    # === ATRI 剧情与性格关键词映射 ===
    # 优先级：Morning/Night > Happy/Angry > Welcome > Click > Talk (Default)
    
    keywords = {
        'morning': [
            '早上', '早安', 'おはよう', 'morning', '朝', '起来', '起床', '早餐', 
            '醒', '光', '太阳', '闹钟'
        ],
        'night': [
            '晚安', '晚上', 'おやすみ', 'night', '夜', '休息', '睡觉', '睡吧', 'sleep', 
            '关闭', '关机', 'log', '日志', '失礼', '明天'
        ],
        'happy': [
            '喜欢', '开心', '笑', '高兴', '幸福', '最棒', '厉害', '好耶', '哈哈', '嘿嘿', '嘻嘻', 
            'suki', 'love', 'kiss', '吻', '约会', '恋人', '女朋友', '萝卜子', '高性能', '夸奖',
            'manju', '馒头', '蟹', 'crab', '螃蟹', 'Peace', '耶', '好玩', '有趣', '嗯哼', 
            'えへへ', 'うふふ', 'やった', '大好き', 'ドキドキ', '心跳', '奖励', '赞'
        ],
        'angry': [
            '讨厌', '笨蛋', 'バカ', 'baka', '嫌', '不准', '禁止', '警告', '生气', '不可以', 
            '色狼', '变态', 'H', '工口', '火箭拳', 'rocket punch', 'ロケットパンチ', '揍', '打你',
            '性能低下', '破烂', '垃圾', '废铁', 'ponkotu', 'ポンコツ', '不要', '住手', 'yada',
            '不可以', '不行', 'mu', '牟'
        ],
        'welcome': [
            '欢迎', '回来', '你好', '此方', 'Konata', '夏生', 'Natsuki', '主人', 'Master', 
            'こんにちは', 'tadaima', 'okaeri', '您好', '初次见面', '启动', '初始化', '请多关照',
            '我是', 'my name'
        ],
        'click': [
            '?', '？', '什么', '怎么', '嗯', 'え', '何', 'nani', 'ano', '那个', '哎', '啊', 
            '是', 'yes', 'hai', '收到', '了解', '明白', '指令', '报告', '检测', '观察', '戳',
            '诶', '哦'
        ]
    }

    count = {k:0 for k in categories}

    for entry in entries:
        raw_text = (entry['text'] + " " + entry['ja']).lower()
        
        # 1. 优先判定早晚安
        is_assigned = False
        
        # Morning
        for kw in keywords['morning']:
            if kw in raw_text:
                categories['morning'].append(entry)
                count['morning'] += 1
                is_assigned = True
                break
        if is_assigned: continue

        # Night
        for kw in keywords['night']:
            if kw in raw_text:
                categories['night'].append(entry)
                count['night'] += 1
                is_assigned = True
                break
        if is_assigned: continue

        # Happy
        for kw in keywords['happy']:
            if kw in raw_text:
                categories['happy'].append(entry)
                count['happy'] += 1
                is_assigned = True
                break
        if is_assigned: continue
        
        # Angry
        for kw in keywords['angry']:
            if kw in raw_text:
                categories['angry'].append(entry)
                count['angry'] += 1
                is_assigned = True
                break
        if is_assigned: continue

        # Welcome
        for kw in keywords['welcome']:
            if kw in raw_text:
                categories['welcome'].append(entry)
                count['welcome'] += 1
                is_assigned = True
                break
        if is_assigned: continue

        # Click (short/question)
        # 如果句子很短（少于10个字）或者是疑问，更有可能是点击反馈
        if len(entry['text']) < 15:
             for kw in keywords['click']:
                if kw in raw_text:
                    categories['click'].append(entry)
                    count['click'] += 1
                    is_assigned = True
                    break
        if is_assigned: continue

        # Talk (Default for long sentences or unmatched)
        categories['talk'].append(entry)
        count['talk'] += 1

    # Print summary
    print("Categorization Summary:")
    for k, v in count.items():
        print(f"  {k}: {v}")

    # Clean up empty categories
    final_cats = {k: v for k, v in categories.items() if v}
    return final_cats

def main():
    import os
    valid = get_valid_files()
    entries = parse_dialogs(valid)
    cats = categorize_entries(entries)

    config = {
        'enabled': True,
        'volume': 0.6,
        'baseUrl': 'https://cdn.jsdelivr.net/gh/Zhouhang9527/atri-voice-data@main/voice/',
        'categories': cats
    }

    with open(OUTPUT_CONFIG, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"Generated config with {sum(len(v) for v in cats.values())} entries.")

if __name__ == '__main__':
    main()
