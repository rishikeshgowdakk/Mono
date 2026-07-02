import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Image as ImageIcon, Music, File as FileIcon, Trash2, Download, ExternalLink, Video as VideoIcon, Edit2, Check, X, Clock, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FeedItem {
  id: string;
  type: 'text' | 'file';
  content: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: any;
}

export default function Feed({ roomId, onActivity, db: customDbProp }: { roomId: string, onActivity?: () => void, db?: any }) {
  const activeDb = customDbProp || db;
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<FeedItem | null>(null);

  useEffect(() => {
    const feedRef = collection(activeDb, 'rooms', roomId, 'feed');
    const q = query(feedRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedItem[];
      setItems(newItems);
      setLoading(false);
    }, (error) => {
      console.error("Feed Snapshot Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId, activeDb]);

  const deleteItem = async (item: FeedItem) => {
    try {
      await deleteDoc(doc(activeDb, 'rooms', roomId, 'feed', item.id));
      onActivity?.();
      if (item.type === 'file' && item.content) {
        try {
          const fileRef = ref(storage, item.content);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn('Could not delete from storage:', storageErr);
        }
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const startEdit = (item: FeedItem) => {
    setEditingId(item.id);
    if (item.type === 'text') {
      setEditContent(item.content);
    } else {
      setEditFileName(item.fileName || '');
    }
  };

  const saveEdit = async (item: FeedItem) => {
    try {
      if (item.type === 'text') {
        if (!editContent.trim()) return;
        await updateDoc(doc(activeDb, 'rooms', roomId, 'feed', item.id), {
          content: editContent.trim()
        });
        onActivity?.();
      } else {
        if (!editFileName.trim()) return;
        await updateDoc(doc(activeDb, 'rooms', roomId, 'feed', item.id), {
          fileName: editFileName.trim()
        });
        onActivity?.();
      }
      setEditingId(null);
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  if (loading) return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4">
        <Clock className="w-8 h-8" />
      </div>
      <p className="text-sm font-medium text-gray-400">No items shared yet.</p>
      <p className="text-[10px] uppercase tracking-widest text-gray-300 mt-1">Upload files to see them here.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group bg-white border border-gray-100 p-4 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                {item.type === 'text' ? <FileText className="w-5 h-5" /> : (
                  item.fileType?.startsWith('image/') ? <ImageIcon className="w-5 h-5" /> :
                  item.fileType?.startsWith('audio/') ? <Music className="w-5 h-5" /> :
                  item.fileType?.startsWith('video/') ? <VideoIcon className="w-5 h-5" /> :
                  <FileIcon className="w-5 h-5" />
                )}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                    {item.createdAt?.toDate ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                  </span>
                  <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    {editingId !== item.id && (
                        <button 
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title={item.type === 'text' ? 'Edit' : 'Rename'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button 
                      onClick={() => deleteItem(item)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.type === 'text' ? (
                  editingId === item.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full text-sm p-3 border border-blue-200 rounded-xl outline-none resize-none focus:ring-2 focus:ring-blue-100 transition-all"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">
                          Cancel
                        </button>
                        <button onClick={() => saveEdit(item)} className="px-3 py-1 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap break-words font-medium">
                      {item.content}
                    </p>
                  )
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editFileName}
                            onChange={(e) => setEditFileName(e.target.value)}
                            className="w-full text-sm p-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">
                              Cancel
                            </button>
                            <button onClick={() => saveEdit(item)} className="px-3 py-1 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-gray-900 truncate block">{item.fileName}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatSize(item.fileSize)}</span>
                        </>
                      )}
                    </div>

                    {item.fileType?.startsWith('image/') && (
                      <div 
                        onClick={() => setSelectedMedia(item)}
                        className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100 group/img cursor-pointer"
                      >
                        <img 
                          src={item.content} 
                          alt={item.fileName} 
                          className="w-full h-auto object-cover max-h-48 hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}

                    {item.fileType?.startsWith('video/') && (
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-inner group/vid">
                        <video className="w-full h-full object-contain">
                          <source src={item.content} type={item.fileType} />
                        </video>
                        <div 
                          onClick={() => setSelectedMedia(item)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer group-hover/vid:bg-black/20 transition-colors"
                        >
                          <VideoIcon className="w-10 h-10 text-white opacity-80" />
                        </div>
                      </div>
                    )}

                    {item.fileType?.startsWith('audio/') && (
                      <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <audio controls className="w-full h-8">
                          <source src={item.content} type={item.fileType} />
                        </audio>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-1">
                      <a 
                        href={item.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => onActivity?.()}
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                      <a 
                        href={item.content} 
                        download={item.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onActivity?.()}
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Media Lightbox */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMedia(null)}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
          >
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
            >
              <X className="w-8 h-8" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full flex flex-col items-center gap-4"
            >
              {selectedMedia.fileType?.startsWith('image/') ? (
                <img 
                  src={selectedMedia.content} 
                  alt={selectedMedia.fileName} 
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <video controls autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl">
                  <source src={selectedMedia.content} type={selectedMedia.fileType} />
                </video>
              )}
              <div className="text-center">
                <h4 className="text-white font-bold text-lg">{selectedMedia.fileName}</h4>
                <p className="text-white/50 text-xs uppercase tracking-widest mt-1">{formatSize(selectedMedia.fileSize)}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
