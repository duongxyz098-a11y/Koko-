import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, Grid, Bookmark, UserSquare, Image as ImageIcon, MessageCircle, Rabbit } from 'lucide-react';
import { sendCoreMessageStream } from '../../services/coreAi';
import { KokoUserProfile } from '../types';

import { safeSetItem } from '../../utils/storage';
import { compressImage } from '../../utils/imageUtils';

export default function UserProfileTab({ onBack, onBgUpload, bgInputRef }: { onBack?: () => void, onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>, bgInputRef: React.RefObject<HTMLInputElement> }) {
  const [view, setView] = useState<'list' | 'create' | 'detail'>(() => {
    return (localStorage.getItem('koko_profile_view') as any) || 'list';
  });

  useEffect(() => {
    safeSetItem('koko_profile_view', view);
  }, [view]);

  const [profiles, setProfiles] = useState<KokoUserProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<KokoUserProfile | null>(() => {
    const saved = localStorage.getItem('koko_selected_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { return null; }
    }
    return null;
  });

  useEffect(() => {
    if (selectedProfile) {
      safeSetItem('koko_selected_profile', JSON.stringify(selectedProfile));
    } else {
      localStorage.removeItem('koko_selected_profile');
    }
  }, [selectedProfile]);
  const [loading, setLoading] = useState(false);
  const [commentingPostIndex, setCommentingPostIndex] = useState<number | null>(null);
  const [commentingProgress, setCommentingProgress] = useState<string>('');
  const [replyingPostIndex, setReplyingPostIndex] = useState<number | null>(null);
  const [replyLength, setReplyLength] = useState<number>(50);
  const [collectiveLength, setCollectiveLength] = useState<number>(1000);
  const [collectiveNpcCount, setCollectiveNpcCount] = useState<number>(5);
  const [customNpcCount, setCustomNpcCount] = useState<number>(100);
  const [postComments, setPostComments] = useState<Record<string, Record<string, any[]>>>({});

  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const postImageInputRef = useRef<HTMLInputElement>(null);

  const npcAvatars = [
    'https://i.postimg.cc/VsxwJ5ST/d3275218ade91706874a1406ccd8fee2.jpg',
    'https://i.postimg.cc/ncwdkVQh/27f8680be6af0f668a2309f3abdc8fe2.jpg',
    'https://i.postimg.cc/Kj8NPCG4/a2bf893052d9a8ec60fc7a57edd0b25a.jpg'
  ];

  useEffect(() => {
    const savedComments = localStorage.getItem('koko_post_comments');
    if (savedComments) {
      try { 
        const parsed = JSON.parse(savedComments);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setPostComments(parsed);
        } else {
          setPostComments({});
        }
      } catch(e) {
        setPostComments({});
      }
    }
  }, []);

  const saveComments = (newComments: Record<string, Record<string, any[]>>) => {
    safeSetItem('koko_post_comments', JSON.stringify(newComments));
  };

  const [formData, setFormData] = useState<Partial<KokoUserProfile>>({
    name: '', age: '', appearance: '', details: '', personality: '',
    hobbies: '', mbti: '', zodiac: '', petName: '', nickname: '',
    color: '', loveStyle: '', avatar: '', cover: '', posts: [],
    followers: 0, following: 0, stories: []
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('koko_user_profiles');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setProfiles(parsed);
        } else {
          setProfiles([]);
        }
      } catch(e) {
        setProfiles([]);
      }
    }
  }, []);

  const saveProfiles = (newProfiles: KokoUserProfile[]) => {
    setProfiles(newProfiles);
    safeSetItem('koko_user_profiles', JSON.stringify(newProfiles));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.8);
        setFormData({ ...formData, [field]: compressed });
      } catch (error) {
        console.error("Compression failed", error);
      }
    }
  };

  const [newStoryName, setNewStoryName] = useState('');

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedProfile) {
      const storyName = newStoryName.trim() || "Story";
      try {
        const compressed = await compressImage(file, 400, 400, 0.8);
        const newStory = { id: Date.now().toString(), image: compressed, name: storyName };
        const updatedProfile = {
          ...selectedProfile,
          stories: [...(selectedProfile.stories || []), newStory]
        };
        const newProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
        saveProfiles(newProfiles);
        setSelectedProfile(updatedProfile);
        setNewStoryName('');
      } catch (error) {
        console.error("Story compression failed", error);
      }
      e.target.value = '';
    }
  };

  const handleSaveProfile = () => {
    if ((formData as any).id) {
      const updatedProfiles = profiles.map(p => p.id === (formData as any).id ? formData as KokoUserProfile : p);
      saveProfiles(updatedProfiles);
      setSelectedProfile(formData as KokoUserProfile);
      setView('detail');
    } else {
      const newProfile: KokoUserProfile = {
        ...formData as KokoUserProfile,
        id: Date.now().toString(),
        posts: [],
        followers: 0,
        following: 0
      };
      saveProfiles([...profiles, newProfile]);
      setView('list');
    }
    setFormData({
      name: '', age: '', appearance: '', details: '', personality: '',
      hobbies: '', mbti: '', zodiac: '', petName: '', nickname: '',
      color: '', loveStyle: '', avatar: '', cover: ''
    });
  };

  const hasGeneratedRef = useRef(false);

  useEffect(() => {
    hasGeneratedRef.current = false;
  }, [selectedProfile?.id]);

  useEffect(() => {
    if (view === 'detail' && selectedProfile && (!selectedProfile.posts || selectedProfile.posts.length === 0) && !loading && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      handleGeneratePosts();
    }
  }, [view, selectedProfile, loading]);

  const handleGeneratePosts = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      const prompt = `Dựa vào thông tin hồ sơ sau: Tên ${selectedProfile.name}, Tuổi ${selectedProfile.age}, Sở thích ${selectedProfile.hobbies}, Tính cách ${selectedProfile.personality}.
Hãy tạo:
1. Số lượng người theo dõi (followers) phù hợp với hồ sơ này (số nguyên).
2. Số lượng người đang theo dõi (following) phù hợp (số nguyên).
3. 10 bài viết Instagram (mỗi bài khoảng 500 ký tự).
Trả về MỘT OBJECT JSON duy nhất với định dạng: {"followers": number, "following": number, "posts": ["bài 1", "bài 2", ...]}. KHÔNG TRẢ VỀ GÌ KHÁC NGOÀI JSON OBJECT.`;
      
      const response = await sendCoreMessageStream(
        prompt, [], 
        { title: 'Koko', context: 'Tạo bài viết và thông tin', rules: 'CHỈ TRẢ VỀ JSON OBJECT. KHÔNG SUY NGHĨ.', length: 'Dài', ooc: 'Không' },
        { mode: 'online', minChars: 0, maxChars: 100000, maxTokens: 50000, timeoutMinutes: 10 }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.choices?.[0]?.delta?.content) {
                  fullText += json.choices[0].delta.content;
                }
              } catch(e){}
            }
          }
        }
      }

      let newPosts = [];
      let newFollowers = selectedProfile.followers || 0;
      let newFollowing = selectedProfile.following || 0;

      try {
        const jsonStr = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.posts && Array.isArray(parsed.posts)) {
            newPosts = parsed.posts.map((p: string, i: number) => ({
              id: `ai_${Date.now()}_${i}`,
              text: p,
              createdAt: new Date().toISOString()
            }));
          }
          if (typeof parsed.followers === 'number') newFollowers = parsed.followers;
          if (typeof parsed.following === 'number') newFollowing = parsed.following;
        }
      } catch(e) {
        console.error("Failed to parse response", e);
      }

      const updatedProfile = {
        ...selectedProfile,
        followers: newFollowers,
        following: newFollowing,
        posts: [...(selectedProfile.posts || []), ...(newPosts || [])]
      };
      
      const newProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
      saveProfiles(newProfiles);
      setSelectedProfile(updatedProfile);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNpcComments = async (postIndex: number, count: number) => {
    if (!selectedProfile || commentingPostIndex !== null) return;
    const post = selectedProfile.posts[postIndex];
    if (!post) return;
    const postId = typeof post === 'string' ? `legacy_${postIndex}` : post.id;

    setCommentingPostIndex(postIndex);
    const postContent = typeof post === 'string' ? post : post.text;
    
    // Fallback context if profile not fully set up
    const profileContext = {
      name: selectedProfile.name || "Người dùng",
      personality: selectedProfile.personality || "Thân thiện, hòa đồng, vui vẻ",
      details: selectedProfile.details || "Một người yêu đời và thích chia sẻ khoảnh khắc",
    };

    try {
      // For 200 count, we do 100 pairs (NPC + Bot Reply)
      const isMixed = count === 200;
      const targetNpcCount = isMixed ? 100 : count;
      const uniqueCount = count >= 1000 ? 50 : (count >= 200 ? 20 : 10);
      
      setCommentingProgress(`API Proxy: Đang nhận nhiệm vụ${isMixed ? ' đan xen' : ''}...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setCommentingProgress(`API Proxy: Đang thiết lập cấu hình (${targetNpcCount} NPC)...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setCommentingProgress(`API Proxy: Đang phân tích bài đăng và lên ý tưởng...`);
      await new Promise(resolve => setTimeout(resolve, 500));

      const prompt = `[NHIỆM VỤ: API PROXY CỦA NGƯỜI DÙNG TẠO BÌNH LUẬN]
Hãy viết ${uniqueCount} câu bình luận cực kỳ đa dạng cho bài đăng: "${postContent}". 
Yêu cầu:
- Các câu không được trùng lặp.
- Sử dụng nhiều icon cảm xúc.
- Phù hợp với tính cách của ${profileContext.name}.
Trả về một mảng JSON các chuỗi: ["comment 1", "comment 2", ...]. CHỈ TRẢ VỀ JSON ARRAY.`;

      const response = await sendCoreMessageStream(
        prompt, [], 
        { title: `NPC Comments ${count}`, context: `Tạo ${targetNpcCount} bình luận`, rules: 'JSON Array only.', length: 'Dài', ooc: 'Không' },
        { mode: 'online', maxTokens: 100000, timeoutMinutes: 5, minChars: 0, maxChars: 100000 }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.choices?.[0]?.delta?.content) {
                  fullText += json.choices[0].delta.content;
                  setCommentingProgress(`API Proxy đang xử lý dữ liệu NPC...`);
                }
              } catch(e){}
            }
          }
        }
      }

      let npcComments: string[] = [];
      try {
        const jsonStr = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
        const match = jsonStr.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) npcComments = parsed;
        }
      } catch(e) {}
      
      if (npcComments.length === 0) {
        npcComments = ["Tuyệt vời!", "Hay quá!", "Đỉnh thật sự!", "Thích quá đi!"];
      }

      if (npcComments.length > 0) {
        const finalComments: any[] = [];
        
        if (isMixed) {
          // Generate both comments and replies in batches
          const batchSize = 50;
          for (let i = 0; i < targetNpcCount; i += batchSize) {
            const currentBatch: any[] = [];
            const currentBatchSize = Math.min(batchSize, targetNpcCount - i);
            
            // 1. Add NPCs for this batch
            for (let j = 0; j < currentBatchSize; j++) {
              let text = npcComments[(i + j) % npcComments.length];
              if (typeof text === 'object' && text !== null) {
                text = (text as any).comment || (text as any).text || JSON.stringify(text);
              }
              if (typeof text !== 'string') text = String(text || "Tuyệt vời quá! ❤️");
              
              const avatar = npcAvatars[Math.floor(Math.random() * npcAvatars.length)];
              const newComment = {
                id: Date.now() + i + j,
                text,
                avatar,
                name: `NPC_${Math.floor(Math.random() * 10000)}`,
                reply: ''
              };
              currentBatch.push(newComment);
              finalComments.push(newComment);
            }

            // Update UI with new NPCs
            setPostComments(prev => ({
              ...prev,
              [selectedProfile.id]: {
                ...(prev[selectedProfile.id] || {}),
                [postId]: [...finalComments]
              }
            }));
            setCommentingProgress(`API Proxy: Đang tạo NPC (${i + currentBatch.length}/${targetNpcCount})...`);
            await new Promise(resolve => setTimeout(resolve, 100));

            // 2. Generate replies for this batch
            setCommentingProgress(`API Proxy: ${profileContext.name} đang suy nghĩ câu trả lời (${i + currentBatch.length}/${targetNpcCount})...`);
            
            const batchCommentsText = currentBatch.map((c, idx) => `${idx + 1}. ${c.name}: "${c.text}"`).join('\n');
            const replyPrompt = `[NHIỆM VỤ: API PROXY TRẢ LỜI BÌNH LUẬN THEO LÔ]
Bạn là ${profileContext.name} (Tính cách: ${profileContext.personality}). 
Hãy trả lời ${currentBatch.length} bình luận sau đây một cách thân thiện và đan xen:
${batchCommentsText}

Yêu cầu:
- Trả về một mảng JSON các chuỗi trả lời tương ứng: ["reply 1", "reply 2", ...].
- Độ dài mỗi câu: Khoảng ${replyLength} ký tự.
- CHỈ TRẢ VỀ JSON ARRAY.`;

            const replyResponse = await sendCoreMessageStream(
              replyPrompt, [], 
              { title: 'Batch Reply', context: 'Trả lời NPC đan xen', rules: 'JSON Array only.', length: 'Dài', ooc: 'Không' },
              { mode: 'online', maxTokens: 10000, minChars: 0, maxChars: 10000 }
            );

            const replyReader = replyResponse.body?.getReader();
            let batchReplyText = '';
            if (replyReader) {
              while (true) {
                const { done, value } = await replyReader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                      const json = JSON.parse(line.slice(6));
                      if (json.choices?.[0]?.delta?.content) {
                        batchReplyText += json.choices[0].delta.content;
                      }
                    } catch(e){}
                  }
                }
              }
            }

            let batchReplies: string[] = [];
            try {
              const jsonStr = batchReplyText.replace(/```json/g, '').replace(/```/g, '').trim();
              const match = jsonStr.match(/\[[\s\S]*\]/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) batchReplies = parsed;
              }
            } catch(e) {}

            // 3. Update UI with replies instantly (no fake streaming to prevent lag)
            for (let j = 0; j < currentBatch.length; j++) {
              let reply = batchReplies[j];
              if (typeof reply === 'object' && reply !== null) {
                reply = (reply as any).reply || (reply as any).text || JSON.stringify(reply);
              }
              if (typeof reply !== 'string') reply = String(reply || "Cảm ơn bạn nha! 💖");
              
              const commentIndex = finalComments.length - currentBatch.length + j;
              finalComments[commentIndex] = {
                ...finalComments[commentIndex],
                reply: reply
              };
            }
            
            setPostComments(prev => ({
              ...prev,
              [selectedProfile.id]: {
                ...(prev[selectedProfile.id] || {}),
                [postId]: [...finalComments]
              }
            }));
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          // Standard NPC generation (no replies)
          const batchSize = count >= 1000 ? 50 : (count >= 500 ? 20 : 10); 
          const delay = 50;

          for (let i = 0; i < count; i++) {
            let text = npcComments[i % npcComments.length];
            if (typeof text === 'object' && text !== null) {
              text = (text as any).comment || (text as any).text || JSON.stringify(text);
            }
            if (typeof text !== 'string') text = String(text || "Tuyệt vời! ✨");
            
            const avatar = npcAvatars[Math.floor(Math.random() * npcAvatars.length)];
            const newComment = {
              id: Date.now() + i,
              text,
              avatar,
              name: `NPC_${Math.floor(Math.random() * 10000)}`
            };
            finalComments.push(newComment);
            
            if (i % batchSize === 0 || i === count - 1) {
              setPostComments(prev => ({
                ...prev,
                [selectedProfile.id]: {
                  ...(prev[selectedProfile.id] || {}),
                  [postId]: [...finalComments]
                }
              }));
              setCommentingProgress(`API Proxy đang tạo NPC: ${i + 1}/${count}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        setCommentingProgress(`API Proxy: Đã hoàn thành nhiệm vụ!`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setPostComments(prev => {
          const finalState = {
            ...prev,
            [selectedProfile.id]: {
              ...(prev[selectedProfile.id] || {}),
              [postId]: finalComments
            }
          };
          setTimeout(() => saveComments(finalState), 0);
          return finalState;
        });
      }
    } catch (e) {
      console.error(e);
      // Remove alert to prevent blocking iframe
    } finally {
      setCommentingPostIndex(null);
      setCommentingProgress('');
    }
  };

  const handleCollectiveNpcTask = async (postIndex: number) => {
    if (!selectedProfile || commentingPostIndex !== null) return;
    const post = selectedProfile.posts[postIndex];
    if (!post) return;
    const postId = typeof post === 'string' ? `legacy_${postIndex}` : post.id;

    setCommentingPostIndex(postIndex);
    const postContent = typeof post === 'string' ? post : post.text;

    try {
      setCommentingProgress(`API Proxy: Đang khởi động nhiệm vụ hợp sức...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCommentingProgress(`API Proxy: Đang thiết lập cấu hình (${collectiveNpcCount} NPC, ${collectiveLength} ký tự)...`);
      await new Promise(resolve => setTimeout(resolve, 800));

      const prompt = `[NHIỆM VỤ HỢP SỨC - API PROXY CỦA NGƯỜI DÙNG]
Hãy tạo một chuỗi các bình luận từ ${collectiveNpcCount} NPC khác nhau cùng thảo luận về bài đăng: "${postContent}".
TỔNG SỐ KÝ TỰ CỦA TẤT CẢ BÌNH LUẬN PHẢI ĐẠT KHOẢNG: ${collectiveLength} ký tự.
Yêu cầu:
- Mỗi bình luận phải có tên NPC và nội dung.
- Các NPC phải tương tác với nhau hoặc cùng khen ngợi bài đăng.
Trả về một mảng JSON các object: [{"name": "NPC 1", "text": "nội dung..."}, ...]
CHỈ TRẢ VỀ JSON ARRAY.`;

      const response = await sendCoreMessageStream(
        prompt, [], 
        { title: 'Collective Task', context: 'NPCs hợp sức bình luận', rules: 'Chỉ trả về JSON Array.', length: 'Dài', ooc: 'Không' },
        { mode: 'online', maxTokens: 100000, timeoutMinutes: 15, minChars: 10, maxChars: 100000 }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.choices?.[0]?.delta?.content) {
                  fullText += json.choices[0].delta.content;
                  setCommentingProgress(`API Proxy đang tổng hợp ý kiến từ ${collectiveNpcCount} NPC...`);
                }
              } catch(e){}
            }
          }
        }
      }

      let collectiveComments: any[] = [];
      try {
        const jsonStr = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
        const match = jsonStr.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) collectiveComments = parsed;
        }
      } catch(e) {}

      if (collectiveComments.length > 0) {
        setPostComments(prev => ({
          ...prev,
          [selectedProfile.id]: {
            ...(prev[selectedProfile.id] || {}),
            [postId]: []
          }
        }));

        const finalComments: any[] = [];
        for (let i = 0; i < collectiveComments.length; i++) {
          const item = collectiveComments[i];
          let text = item?.text;
          let name = item?.name;
          if (typeof item === 'string') {
            text = item;
          }
          if (typeof text !== 'string') text = String(text || "Tuyệt vời!");
          
          const avatar = npcAvatars[Math.floor(Math.random() * npcAvatars.length)];
          const newComment = {
            id: Date.now() + i,
            text,
            avatar,
            name: name || `NPC_${Math.floor(Math.random() * 10000)}`
          };
          
          finalComments.push(newComment);
          
          setPostComments(prev => ({
            ...prev,
            [selectedProfile.id]: {
              ...(prev[selectedProfile.id] || {}),
              [postId]: [...finalComments]
            }
          }));
          
          setCommentingProgress(`API Proxy: NPC ${newComment.name} (${i + 1}/${collectiveComments.length}) đang đăng bình luận...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        setCommentingProgress(`API Proxy: Đã hoàn thành nhiệm vụ hợp sức!`);
        await new Promise(resolve => setTimeout(resolve, 800));

        setPostComments(prev => {
          const finalState = {
            ...prev,
            [selectedProfile.id]: {
              ...(prev[selectedProfile.id] || {}),
              [postId]: finalComments
            }
          };
          setTimeout(() => saveComments(finalState), 0);
          return finalState;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCommentingPostIndex(null);
      setCommentingProgress('');
    }
  };

  const handleNpcReplies = async (postIndex: number) => {
    if (!selectedProfile || replyingPostIndex !== null) return;
    const post = selectedProfile.posts[postIndex];
    if (!post) return;
    const postId = typeof post === 'string' ? `legacy_${postIndex}` : post.id;
    
    const comments = postComments[selectedProfile.id]?.[postId];
    if (!Array.isArray(comments) || comments.length === 0) return;

    setReplyingPostIndex(postIndex);
    const commentsToReply = comments.map((c, i) => ({ ...c, originalIndex: i })).filter(c => !c.reply);
    if (commentsToReply.length === 0) {
      setReplyingPostIndex(null);
      return;
    }

    try {
      const batchSize = 50;
      for (let i = 0; i < commentsToReply.length; i += batchSize) {
        const currentBatch = commentsToReply.slice(i, i + batchSize);
        
        setCommentingProgress(`API Proxy: Đang suy nghĩ câu trả lời (${i + 1} - ${i + currentBatch.length}/${commentsToReply.length})...`);
        
        const batchCommentsText = currentBatch.map((c, idx) => `${idx + 1}. ${c.name}: "${c.text}"`).join('\n');
        const replyPrompt = `[NHIỆM VỤ: API PROXY TRẢ LỜI BÌNH LUẬN THEO LÔ]
Bạn là ${selectedProfile.name} (Tính cách: ${selectedProfile.personality}). 
Hãy trả lời ${currentBatch.length} bình luận sau đây một cách thân thiện:
${batchCommentsText}

Yêu cầu:
- Trả về một mảng JSON các chuỗi trả lời tương ứng: ["reply 1", "reply 2", ...].
- Độ dài mỗi câu: Khoảng ${replyLength} ký tự.
- CHỈ TRẢ VỀ JSON ARRAY.`;

        const replyResponse = await sendCoreMessageStream(
          replyPrompt, [], 
          { title: 'Batch Reply', context: 'Trả lời NPC', rules: 'JSON Array only.', length: 'Dài', ooc: 'Không' },
          { mode: 'online', maxTokens: 10000, minChars: 0, maxChars: 10000 }
        );

        const replyReader = replyResponse.body?.getReader();
        const decoder = new TextDecoder();
        let batchReplyText = '';
        if (replyReader) {
          while (true) {
            const { done, value } = await replyReader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.choices?.[0]?.delta?.content) {
                    batchReplyText += json.choices[0].delta.content;
                  }
                } catch(e){}
              }
            }
          }
        }

        let batchReplies: string[] = [];
        try {
          const jsonStr = batchReplyText.replace(/```json/g, '').replace(/```/g, '').trim();
          const match = jsonStr.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) batchReplies = parsed;
          }
        } catch(e) {}

        setPostComments(prev => {
          const postCommentsArray = [...(prev[selectedProfile.id]?.[postId] || [])];
          for (let j = 0; j < currentBatch.length; j++) {
            let reply = batchReplies[j];
            if (typeof reply === 'object' && reply !== null) {
              reply = (reply as any).reply || (reply as any).text || JSON.stringify(reply);
            }
            if (typeof reply !== 'string') reply = String(reply || "Cảm ơn bạn nha! 💖");
            
            const originalIndex = currentBatch[j].originalIndex;
            if (postCommentsArray[originalIndex]) {
              postCommentsArray[originalIndex] = { ...postCommentsArray[originalIndex], reply };
            }
          }
          return {
            ...prev,
            [selectedProfile.id]: {
              ...(prev[selectedProfile.id] || {}),
              [postId]: postCommentsArray
            }
          };
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Final save
      setPostComments(prev => {
        setTimeout(() => saveComments(prev), 0);
        return prev;
      });
      
    } catch (e) {
      console.error(e);
    } finally {
      setReplyingPostIndex(null);
      setCommentingProgress('');
    }
  };

  const handleCreatePost = () => {
    if (!selectedProfile || !newPostText.trim()) return;

    const newPost = {
      id: Date.now().toString(),
      text: newPostText,
      image: newPostImage || null,
      createdAt: new Date().toISOString()
    };

    const updatedProfile = {
      ...selectedProfile,
      posts: [newPost, ...(selectedProfile.posts || [])]
    };

    const newProfiles = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    saveProfiles(newProfiles);
    setSelectedProfile(updatedProfile);
    setNewPostText('');
    setNewPostImage('');
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.6);
        setNewPostImage(compressed);
      } catch (error) {
        console.error("Post image compression failed", error);
      }
    }
  };

  if (view === 'list') {
    return (
      <div className="p-4 pt-16 h-full overflow-y-auto pb-24 bg-white/30 backdrop-blur-sm">
        {onBack && (
          <div className="absolute top-4 left-4 z-50">
            <button onClick={onBack} className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-[#F3B4C2] shadow-sm border border-[#F9C6D4]">
              ← Thoát
            </button>
          </div>
        )}
        <div className="flex justify-between items-center mb-6 mt-8">
          <h1 className="text-2xl font-bold text-[#F3B4C2]">Hồ sơ của bạn</h1>
          <button 
            onClick={() => setView('create')}
            className="p-2 bg-[#F9C6D4] text-white rounded-full shadow-md hover:bg-[#F3B4C2] transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {profiles.map(p => (
            <div 
              key={p.id} 
              onClick={() => { setSelectedProfile(p); setView('detail'); }}
              className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 cursor-pointer hover:shadow-md transition-all flex flex-col items-center text-center"
            >
              <img 
                src={p.avatar || 'https://i.pinimg.com/236x/01/a9/4b/01a94b465b8df4d9d10e5bd7875955a0.jpg'} 
                className="w-20 h-20 rounded-full object-cover border-2 border-[#F9C6D4] mb-3"
              />
              <h3 className="font-bold text-[#8A7D85]">{p.name}</h3>
              <p className="text-xs text-gray-500">{p.age} tuổi • {p.zodiac}</p>
            </div>
          ))}
          {profiles.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-10 bg-white/50 rounded-xl backdrop-blur-sm">
              Chưa có hồ sơ nào. Bấm dấu + để tạo mới.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className={`p-4 h-full overflow-y-auto pb-24 max-w-2xl mx-auto bg-white/30 backdrop-blur-sm ${!onBack ? 'pt-16' : 'pt-safe'}`}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="p-2 bg-white/80 backdrop-blur rounded-full text-[#8A7D85] shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#F3B4C2]">Tạo Hồ Sơ Mới</h1>
        </div>

        <div className="space-y-4">
          {/* Avatar & Cover Upload */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Ảnh đại diện (Avatar)</label>
              <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={e => handleImageUpload(e, 'avatar')} />
              <div 
                onClick={() => avatarInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-white/50 border-2 border-dashed border-[#F9C6D4] flex items-center justify-center cursor-pointer overflow-hidden"
              >
                {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <Plus className="text-[#F9C6D4]" />}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">Ảnh bìa (Cover)</label>
              <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={e => handleImageUpload(e, 'cover')} />
              <div 
                onClick={() => coverInputRef.current?.click()}
                className="w-full h-32 rounded-xl bg-white/50 border-2 border-dashed border-[#F9C6D4] flex items-center justify-center cursor-pointer overflow-hidden"
              >
                {formData.cover ? <img src={formData.cover} className="w-full h-full object-cover" /> : <Plus className="text-[#F9C6D4]" />}
              </div>
            </div>
          </div>

          {[
            { label: 'Tên', key: 'name', type: 'text' },
            { label: 'Tuổi', key: 'age', type: 'text' },
            { label: 'Ngoại hình', key: 'appearance', type: 'textarea' },
            { label: 'Thông tin chi tiết', key: 'details', type: 'textarea' },
            { label: 'Tính Cách', key: 'personality', type: 'textarea' },
            { label: 'Sở Thích', key: 'hobbies', type: 'textarea' },
            { label: 'MBTI', key: 'mbti', type: 'text' },
            { label: 'Cung Hoàng Đạo', key: 'zodiac', type: 'text' },
            { label: 'Muốn char khi đã yêu gọi bạn là gì?', key: 'petName', type: 'text' },
            { label: 'Biệt Danh của bạn là gì?', key: 'nickname', type: 'text' },
            { label: 'Bạn thích màu gì?', key: 'color', type: 'text' },
            { label: 'Bạn muốn yêu đương theo cách như nào?', key: 'loveStyle', type: 'textarea' },
          ].map((field) => (
            <div key={field.key} className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
              <label className="block text-sm font-bold text-[#8A7D85] mb-2">{field.label}</label>
              {field.type === 'text' ? (
                <input 
                  type="text" 
                  value={(formData as any)[field.key]}
                  onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                  className="w-full p-3 rounded-xl bg-white/50 border border-[#F9C6D4] outline-none text-[#8A7D85] focus:ring-2 focus:ring-[#F9C6D4]/50"
                />
              ) : (
                <textarea 
                  value={(formData as any)[field.key]}
                  onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                  className="w-full p-3 rounded-xl bg-white/50 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[80px] focus:ring-2 focus:ring-[#F9C6D4]/50"
                />
              )}
            </div>
          ))}

          <button 
            onClick={handleSaveProfile}
            className="w-full py-4 bg-gradient-to-r from-[#F9C6D4] to-[#F3B4C2] text-white rounded-xl font-bold shadow-lg mt-8 hover:opacity-90 transition-all text-lg"
          >
            Lưu Hồ Sơ
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedProfile) {
    return (
      <div 
        className="min-h-full pb-24 bg-cover bg-center relative"
        style={{ 
          backgroundImage: selectedProfile.cover ? `url('${selectedProfile.cover}')` : 'none',
          backgroundColor: selectedProfile.cover ? 'transparent' : 'rgba(255, 255, 255, 0.3)'
        }}
      >
        <button 
          onClick={() => bgInputRef.current?.click()}
          className="absolute top-2 right-2 p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors z-50"
          title="Đổi ảnh nền toàn trang"
        >
          <ImageIcon size={20} className="text-[#F3B4C2]" />
        </button>
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F3B4C2]"></div>
              <p className="text-[#8A7D85] font-bold mt-4">Đang tạo bài viết...</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm pointer-events-none"></div>
        <div className="relative z-10">
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b border-[#E6DDD8]/50 sticky top-0 bg-white/80 backdrop-blur-md z-20 ${!onBack ? 'pt-16' : 'pt-safe'}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="text-[#8A7D85] bg-white/50 p-2 rounded-full">
                <ArrowLeft size={20} />
              </button>
              <h1 className="font-bold text-[#8A7D85] text-lg">{(selectedProfile.name || 'user').toLowerCase().replace(/\s/g, '_')}</h1>
            </div>
            <button className="text-[#8A7D85] bg-white/50 p-2 rounded-full">☰</button>
          </div>

          <div className="overflow-y-auto h-full">
            {/* Profile Info */}
            <div className="p-4 flex items-center gap-6 bg-white/60 backdrop-blur-md m-4 rounded-2xl shadow-sm border border-white/50">
              <div className="relative">
                <img 
                  src={selectedProfile.avatar || 'https://i.pinimg.com/236x/01/a9/4b/01a94b465b8df4d9d10e5bd7875955a0.jpg'} 
                  className="w-20 h-20 rounded-full border-2 border-[#F9C6D4] p-1 object-cover bg-white"
                />
                <div className="absolute bottom-0 right-0 bg-[#F3B4C2] text-white rounded-full p-1 border-2 border-white">
                  <Plus size={12} />
                </div>
              </div>
              <div className="flex-1 flex justify-around text-center">
                <div className="flex flex-col items-center">
                  <div className="font-bold text-[#8A7D85] text-lg">{selectedProfile.posts?.length || 0}</div>
                  <div className="text-xs text-[#9E919A]">Bài viết</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="font-bold text-[#8A7D85] text-lg">{selectedProfile.followers || 0}</div>
                  <div className="text-xs text-[#9E919A]">Người theo dõi</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="font-bold text-[#8A7D85] text-lg">{selectedProfile.following || 0}</div>
                  <div className="text-xs text-[#9E919A]">Đang theo dõi</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="px-4 pb-4 text-sm text-[#8A7D85] space-y-1 mx-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50">
              <div className="font-bold mb-1 text-base">{selectedProfile.name} 🎀</div>
              <div>✧ Tuổi: {selectedProfile.age} | {selectedProfile.zodiac}</div>
              <div>✧ MBTI: {selectedProfile.mbti}</div>
              <div>✧ Sở thích: {selectedProfile.hobbies}</div>
              <div>✧ Biệt danh: {selectedProfile.nickname}</div>
              <div className="text-blue-500 text-xs mt-1 cursor-pointer">Xem thêm thông tin...</div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 flex gap-2 mb-4 mx-4">
              <button 
                onClick={() => { setFormData(selectedProfile); setView('create'); }}
                className="flex-1 bg-white/80 backdrop-blur-sm text-[#8A7D85] py-2 rounded-xl font-semibold text-sm shadow-sm border border-white/50 hover:bg-white transition-colors"
              >
                Chỉnh sửa hồ sơ
              </button>
              <button className="flex-1 bg-white/80 backdrop-blur-sm text-[#8A7D85] py-2 rounded-xl font-semibold text-sm shadow-sm border border-white/50 hover:bg-white transition-colors">Chia sẻ hồ sơ</button>
              <button className="bg-white/80 backdrop-blur-sm text-[#8A7D85] p-2 rounded-xl shadow-sm border border-white/50 hover:bg-white transition-colors"><UserSquare size={20} /></button>
            </div>

          {/* Stories */}
          <div className="px-4 mb-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide mx-4">
            {(selectedProfile.stories || []).map((story) => (
              <div key={story.id} className="flex flex-col items-center gap-1 min-w-[64px]">
                <div className="w-16 h-16 rounded-full border-2 border-[#F9C6D4] p-0.5 bg-white/50">
                  <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
                    <img 
                      src={story.image} 
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>
                </div>
                <span className="text-xs text-[#8A7D85] truncate w-16 text-center font-medium bg-white/50 px-1 rounded-full">{typeof story.name === 'string' ? story.name : JSON.stringify(story.name)}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              <input type="file" accept="image/*" className="hidden" ref={storyInputRef} onChange={handleStoryUpload} />
              <div 
                onClick={() => storyInputRef.current?.click()}
                className="w-16 h-16 rounded-full border-2 border-dashed border-[#F9C6D4] p-0.5 flex items-center justify-center cursor-pointer bg-white/50 hover:bg-white/80 transition-colors"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center">
                  <Plus size={24} className="text-[#F9C6D4]" />
                </div>
              </div>
              <input 
                type="text" 
                placeholder="Tên story..." 
                value={newStoryName}
                onChange={(e) => setNewStoryName(e.target.value)}
                className="w-16 text-[10px] text-center bg-white/50 rounded-full px-1 py-0.5 outline-none border border-[#F9C6D4]/50 placeholder:text-[#9E919A]"
              />
            </div>
          </div>

          {/* Create Post Section */}
          <div className="mx-4 mb-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50">
            <div className="flex gap-3 mb-3">
              <img 
                src={selectedProfile.avatar || 'https://i.pinimg.com/236x/01/a9/4b/01a94b465b8df4d9d10e5bd7875955a0.jpg'} 
                className="w-10 h-10 rounded-full object-cover border border-[#F9C6D4]"
              />
              <textarea 
                placeholder="Bạn đang nghĩ gì?..." 
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="flex-1 bg-white/50 border border-[#F9C6D4]/30 rounded-xl p-3 text-sm text-[#8A7D85] outline-none focus:ring-1 focus:ring-[#F9C6D4] min-h-[80px] resize-none"
              />
            </div>
            
            {newPostImage && (
              <div className="relative mb-3 rounded-xl overflow-hidden border border-[#F9C6D4]/30">
                <img src={newPostImage} className="w-full h-40 object-cover" />
                <button 
                  onClick={() => setNewPostImage('')}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button 
                onClick={() => postImageInputRef.current?.click()}
                className="flex items-center gap-2 text-[#F3B4C2] text-sm font-medium"
              >
                <ImageIcon size={20} />
                <span>Thêm ảnh</span>
              </button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={postImageInputRef} 
                onChange={handlePostImageUpload} 
              />
              <button 
                onClick={handleCreatePost}
                disabled={!newPostText.trim()}
                className="bg-[#F3B4C2] text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm disabled:opacity-50"
              >
                Đăng bài
              </button>
            </div>
          </div>

          {/* API Generate Button */}
          <div className="px-4 mb-4 mx-4">
            <button 
              onClick={handleGeneratePosts}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#F9C6D4] to-[#F3B4C2] text-white py-3 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Rabbit size={16} />
              {loading ? 'API đang tạo bài viết...' : 'Tạo thêm 10 bài viết bằng API'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-[#E6DDD8]/50 bg-white/50 backdrop-blur-sm">
            <div className="flex-1 flex justify-center py-3 border-b-2 border-[#8A7D85] text-[#8A7D85]">
              <Grid size={24} />
            </div>
            <div className="flex-1 flex justify-center py-3 text-[#D9CFC9]">
              <Bookmark size={24} />
            </div>
            <div className="flex-1 flex justify-center py-3 text-[#D9CFC9]">
              <UserSquare size={24} />
            </div>
          </div>

          {/* Feed */}
          <div className="flex flex-col gap-4 p-4">
            {(selectedProfile.posts || []).map((post: any, i: number) => {
              const postText = typeof post === 'string' ? post : (typeof post.text === 'string' ? post.text : JSON.stringify(post.text));
              const postId = typeof post === 'string' ? `legacy_${i}` : post.id;
              const postImage = typeof post === 'string' 
                ? (i % 2 === 0 ? 'https://i.postimg.cc/VsxwJ5ST/d3275218ade91706874a1406ccd8fee2.jpg' : 'https://i.postimg.cc/MHRh7bcy/bad766039c5d48f97348194069e21e9b.jpg')
                : (post.image || 'https://i.postimg.cc/VsxwJ5ST/d3275218ade91706874a1406ccd8fee2.jpg');

              return (
                <div key={i} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden">
                  <div className="p-3 flex items-center gap-3 border-b border-[#E6DDD8]/50">
                    <img 
                      src={selectedProfile.avatar || 'https://i.pinimg.com/236x/01/a9/4b/01a94b465b8df4d9d10e5bd7875955a0.jpg'} 
                      className="w-10 h-10 rounded-full object-cover border border-[#F9C6D4]"
                    />
                    <div>
                      <div className="font-bold text-[#8A7D85] text-sm">{selectedProfile.name}</div>
                      <div className="text-[10px] text-[#9E919A]">Vừa xong</div>
                    </div>
                  </div>
                  <img 
                    src={postImage} 
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-4">
                    {/* API Proxy Task Center */}
                    <div className="mb-4 p-3 bg-[#FDF2F5] rounded-2xl border border-[#F9C6D4]/50 shadow-sm">
                      <div className="text-[10px] font-bold text-[#F3B4C2] uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Thiết lập nhiệm vụ API Proxy</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-[#F3B4C2] rounded-full animate-ping"></div>
                          <div className="w-1 h-1 bg-[#F3B4C2] rounded-full animate-ping delay-75"></div>
                          <div className="w-1 h-1 bg-[#F3B4C2] rounded-full animate-ping delay-150"></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#8A7D85] ml-1">SỐ LƯỢNG NPC</label>
                          <input 
                            type="number" 
                            value={collectiveNpcCount}
                            onChange={(e) => setCollectiveNpcCount(Number(e.target.value))}
                            className="w-full text-xs border border-[#F9C6D4] rounded-xl px-3 py-2 outline-none bg-white focus:ring-1 focus:ring-[#F3B4C2] transition-all"
                            placeholder="VD: 10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#8A7D85] ml-1">TỔNG KÝ TỰ (TOKEN)</label>
                          <input 
                            type="number" 
                            value={collectiveLength}
                            onChange={(e) => setCollectiveLength(Number(e.target.value))}
                            className="w-full text-xs border border-[#F9C6D4] rounded-xl px-3 py-2 outline-none bg-white focus:ring-1 focus:ring-[#F3B4C2] transition-all"
                            placeholder="VD: 2000"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleCollectiveNpcTask(i)}
                          disabled={commentingPostIndex !== null || replyingPostIndex !== null}
                          className="flex-1 py-2.5 bg-gradient-to-r from-[#F9C6D4] to-[#F3B4C2] text-white rounded-xl text-[11px] font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Chạy nhiệm vụ Hợp sức
                        </button>
                        <button 
                          onClick={() => handleNpcComments(i, collectiveNpcCount)}
                          disabled={commentingPostIndex !== null || replyingPostIndex !== null}
                          className="px-4 py-2.5 bg-white text-[#F3B4C2] border border-[#F3B4C2] rounded-xl text-[11px] font-bold hover:bg-[#FDF2F5] transition-all"
                        >
                          Tạo NPC
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 mb-3 text-[#8A7D85] items-center">
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => handleNpcComments(i, 200)}
                          disabled={commentingPostIndex !== null || replyingPostIndex !== null}
                          className={`p-2 rounded-xl border-2 transition-all ${postComments[selectedProfile.id]?.[postId]?.length === 200 ? 'border-[#F3B4C2] bg-[#F3B4C2] text-white shadow-md' : 'border-[#F9C6D4] text-[#F3B4C2] hover:bg-[#FDF2F5]'}`}
                        >
                          <Rabbit size={24} />
                        </button>
                        <span className="text-[10px] font-bold text-[#F3B4C2]">200</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => handleNpcComments(i, 500)}
                          disabled={commentingPostIndex !== null || replyingPostIndex !== null}
                          className={`p-2 rounded-xl border-2 transition-all ${postComments[selectedProfile.id]?.[postId]?.length === 500 ? 'border-[#F3B4C2] bg-[#F3B4C2] text-white shadow-md' : 'border-[#F9C6D4] text-[#F3B4C2] hover:bg-[#FDF2F5]'}`}
                        >
                          <Rabbit size={24} />
                        </button>
                        <span className="text-[10px] font-bold text-[#F3B4C2]">500</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => handleNpcComments(i, 1000)}
                          disabled={commentingPostIndex !== null || replyingPostIndex !== null}
                          className={`p-2 rounded-xl border-2 transition-all ${postComments[selectedProfile.id]?.[postId]?.length === 1000 ? 'border-[#F3B4C2] bg-[#F3B4C2] text-white shadow-md' : 'border-[#F9C6D4] text-[#F3B4C2] hover:bg-[#FDF2F5]'}`}
                        >
                          <Rabbit size={24} />
                        </button>
                        <span className="text-[10px] font-bold text-[#F3B4C2]">1000</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => handleNpcReplies(i)}
                          disabled={replyingPostIndex !== null || commentingPostIndex !== null || !postComments[selectedProfile.id]?.[postId]}
                          className={`p-1 rounded-full border-2 ${replyingPostIndex === i ? 'border-[#F3B4C2] bg-[#F3B4C2] text-white' : 'border-[#F9C6D4] text-[#F3B4C2]'} transition-all`}
                        >
                          <MessageCircle size={16} />
                        </button>
                        <span className="text-[10px] font-bold text-[#F3B4C2]">Reply</span>
                      </div>
                      <Bookmark size={24} />
                    </div>
                    
                    {(commentingPostIndex === i || replyingPostIndex === i) && (
                      <div className="mb-3 p-3 bg-[#FDF2F5] rounded-xl border border-[#F9C6D4]/30 shadow-inner">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full border-2 border-[#F3B4C2] border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-1 h-1 bg-[#F3B4C2] rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] text-[#F3B4C2] font-bold tracking-tight">
                              {commentingProgress || 'API Proxy của người dùng đang làm việc...'}
                            </span>
                            <span className="text-[9px] text-[#9E919A] uppercase font-bold">Đang xử lý nhiệm vụ...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {Array.isArray(postComments[selectedProfile.id]?.[postId]) && (
                      <div className="flex flex-wrap items-center gap-4 mb-3 p-2 bg-[#FAF9F6] rounded-xl border border-[#E6DDD8]/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#8A7D85]">Bình luận:</span>
                          <span className="text-xs text-[#F3B4C2] font-bold">{postComments[selectedProfile.id][postId].length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">Độ dài reply:</span>
                          <input 
                            type="number" 
                            value={replyLength}
                            onChange={(e) => setReplyLength(Number(e.target.value))}
                            className="w-12 text-[10px] border border-[#F9C6D4] rounded px-1 outline-none bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-[#8A7D85] whitespace-pre-wrap mb-4">
                      <span className="font-bold mr-2">{selectedProfile.name}</span>
                      {postText}
                    </p>

                    {/* Comments Section */}
                    {Array.isArray(postComments[selectedProfile.id]?.[postId]) && (
                      <div className="mt-4 space-y-4 border-t border-[#E6DDD8]/30 pt-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {postComments[selectedProfile.id][postId].map((comment, ci) => (
                          <div key={ci} className="space-y-2">
                            <div className="flex gap-2 items-start">
                              <img src={comment.avatar} className="w-6 h-6 rounded-full object-cover border border-[#F9C6D4]" />
                              <div className="bg-[#FAF9F6] p-2 rounded-lg text-xs flex-1 border border-[#F9C6D4]/30">
                                <span className="font-bold text-[#8A7D85] mr-1">{comment.name}</span>
                                <span className="text-[#9E919A]">{typeof comment.text === 'string' ? comment.text : JSON.stringify(comment.text)}</span>
                              </div>
                            </div>
                            {comment.reply && (
                              <div className="flex gap-2 items-start ml-8">
                                <img src={selectedProfile.avatar || 'https://i.pinimg.com/236x/01/a9/4b/01a94b465b8df4d9d10e5bd7875955a0.jpg'} className="w-5 h-5 rounded-full object-cover border border-[#F3B4C2]" />
                                <div className="bg-[#FDF2F5] p-2 rounded-lg text-xs flex-1 border border-[#F3B4C2]/30 relative">
                                  <div className="absolute -left-2 top-2 w-2 h-2 bg-[#FDF2F5] border-l border-t border-[#F3B4C2]/30 transform -rotate-45"></div>
                                  <span className="font-bold text-[#F3B4C2] mr-1">{selectedProfile.name || 'Bot Char'}</span>
                                  <span className="text-[#8A7D85] italic">{typeof comment.reply === 'string' ? comment.reply : JSON.stringify(comment.reply)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    );
  }

  return null;
}
