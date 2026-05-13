'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { C } from '@/components/Logo';
import { CourseForm, type CourseData } from '@/components/admin/CourseForm';

export function EditCourseClient({ course }: { course: CourseData }) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function handleSuccess() {
    router.push('/admin/courses');
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete course');
      }
      router.push('/admin/courses');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete course');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Link
            href="/admin/courses"
            style={{
              color: C.gray,
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 10,
            }}
          >
            ← Back to Courses
          </Link>
          <h1
            style={{
              margin: 0,
              fontSize: '1.4rem',
              fontWeight: 800,
              color: C.white,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Edit Course
          </h1>
          {course.title && (
            <p style={{ margin: '4px 0 0', color: C.gray, fontSize: '0.82rem' }}>
              {course.title}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            background: `${C.danger}12`,
            color: C.danger,
            fontSize: '0.82rem',
            fontWeight: 600,
            border: `1px solid ${C.danger}30`,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            marginTop: 28,
          }}
        >
          🗑️ Delete Course
        </button>
      </div>

      {deleteError && (
        <div
          role="alert"
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: `${C.danger}18`,
            border: `1px solid ${C.danger}40`,
            color: C.danger,
            fontSize: '0.85rem',
            marginBottom: 16,
          }}
        >
          {deleteError}
        </div>
      )}

      {/* Form card */}
      <div
        style={{
          background: C.navyMid,
          borderRadius: 12,
          border: `1px solid rgba(14,165,233,0.15)`,
          padding: 28,
          maxWidth: 680,
        }}
      >
        <CourseForm initialData={course} onSuccess={handleSuccess} mode="edit" />
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-course-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
          }}
        >
          <div
            style={{
              background: C.navyMid,
              border: `1px solid ${C.danger}40`,
              borderRadius: 14,
              padding: 28,
              maxWidth: 420,
              width: '90%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>🗑️</span>
              <h3
                id="delete-course-title"
                style={{ color: C.danger, margin: 0, fontSize: '1rem', fontWeight: 700 }}
              >
                Delete Course
              </h3>
            </div>
            <p
              style={{ color: C.offWhite, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 20 }}
            >
              Are you sure you want to delete{' '}
              <strong style={{ color: C.white }}>&ldquo;{course.title}&rdquo;</strong>? This action
              cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: C.navyLight,
                  color: C.white,
                  border: `1px solid rgba(14,165,233,0.3)`,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: C.danger,
                  color: C.white,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
