-- Run inside BEGIN/ROLLBACK only. Synthetic content/review receipts must not persist.
do $verify$
declare
 m jsonb; q jsonb; c jsonb; staged jsonb; receipt jsonb; again jsonb;
 reviewer uuid; kind text; before_questions integer; before_notes integer; before_reviews integer;
begin
 select admin_user_id into strict reviewer from public.content_admin_account where singleton=true;
 -- Temporary authorization is part of this rolled-back synthetic fixture, never a production grant.
 foreach kind in array array['medical','references','rights'] loop
  if not public.has_active_reviewer_grant(reviewer,kind) then perform public.set_content_reviewer_grant(reviewer,kind,reviewer,'granted','Rollback-only library test',now()+interval '1 hour'); end if;
 end loop;
 select jsonb_array_length(body->'questions') into before_questions from public.study_catalog where id=1;
 select count(*) into before_notes from public.neural_canonical_note_versions;
 select count(*) into before_reviews from public.content_review_events;
 c:='{"subjects":["medicine"],"systems":[],"organs":[],"domains":["synthetic-interface"],"tasks":[]}'::jsonb;
 q:=jsonb_build_object('questionId','verification:library-q-a','stem','NONCLINICAL TEST ONLY: select the first synthetic label.','options','[{"optionId":"a","text":"Alpha"},{"optionId":"b","text":"Beta"}]'::jsonb,'answerOptionId','a','explanation','Synthetic software acceptance, not medical teaching.','conceptLinks','[{"conceptId":"verification:library-concept","role":"primary"}]'::jsonb,'sourceIds','["verification:library-source"]'::jsonb,'origins','[{"kind":"platform","platformId":"dams","edition":"synthetic","evidence":"Synthetic test only"}]'::jsonb,'classification',c);
 m:=jsonb_build_object('schemaVersion',1,'importId','verification:library-import',
  'concepts',jsonb_build_array(jsonb_build_object('conceptId','verification:library-concept','label','Nonclinical library acceptance concept','aliases','[]'::jsonb,'subjectTags','["medicine"]'::jsonb,'classification',c)),
  'sources','[{"sourceId":"verification:library-source","title":"Nonclinical verification source","url":null,"version":"1","evidence":"Synthetic software fixture"}]'::jsonb,
  'questions',jsonb_build_array(q,q||jsonb_build_object('questionId','verification:library-q-b','options','[{"optionId":"y","text":"Beta"},{"optionId":"x","text":"Alpha"}]'::jsonb,'answerOptionId','x','origins','[{"kind":"platform","platformId":"marrow","edition":"synthetic","evidence":"Synthetic test only"}]'::jsonb)),
  'notes','[{"noteId":"verification:library-note","conceptId":"verification:library-concept","title":"Nonclinical acceptance note","bodyMarkdown":"Synthetic note body.","sourceIds":["verification:library-source"],"provenance":{"kind":"ai_generated_original","evidence":"Synthetic software test only"}}]'::jsonb,
  'noteQuestionLinks','[{"noteId":"verification:library-note","questionId":"verification:library-q-b","relation":"explains","section":""}]'::jsonb);
 staged:=public.content_library_stage_v1(m,null);
 if staged->>'status'<>'draft' or (select jsonb_array_length(body->'questions') from public.study_catalog where id=1)<>before_questions then raise exception 'staging_changed_catalog'; end if;
 again:=public.content_library_stage_v1(m,null); if again<>staged then raise exception 'stage_replay_changed'; end if;
 begin perform public.content_library_stage_v1(jsonb_set(m,'{questions,0,stem}','"Changed payload"'),null); raise exception 'changed_payload_accepted';
 exception when others then if sqlerrm not like '%import_payload_conflict%' then raise; end if; end;
 begin perform public.content_library_review_publish_v1(m->>'importId',reviewer,repeat('0',64),'[]','Test inspection',true); raise exception 'stale_digest_accepted';
 exception when others then if sqlerrm not like '%stale_import_digest%' then raise; end if; end;
 begin perform public.content_library_review_publish_v1(m->>'importId',reviewer,staged->>'digest','[]','Test inspection',false); raise exception 'missing_attestation_accepted';
 exception when others then if sqlerrm not like '%review_attestation_required%' then raise; end if; end;
 begin perform public.content_library_review_publish_v1(m->>'importId',reviewer,staged->>'digest','[]','Test inspection',true); raise exception 'missing_rights_accepted';
 exception when others then if sqlerrm not like '%rights%' then raise; end if; end;
 if (select count(*) from public.content_review_events)<>before_reviews then raise exception 'failed_publication_left_receipts'; end if;
 receipt:=public.content_library_review_publish_v1(m->>'importId',reviewer,staged->>'digest','[{"sourceId":"verification:library-source","rightsStatus":"owned","evidence":"Synthetic fixture ownership; test only"}]','Rollback-only synthetic Medical, References and Rights inspection',true);
 if receipt->>'status'<>'published' or (receipt->>'newQuestions')::integer<>1 or (receipt->>'existingQuestionsLinked')::integer<>1 or (receipt->>'newNotes')::integer<>1 then raise exception 'publication_counts_wrong: %',receipt; end if;
 if receipt->'questionMap'->>'verification:library-q-b'<>'verification:library-q-a' then raise exception 'duplicate_not_canonical'; end if;
 if (select jsonb_array_length(body->'questions') from public.study_catalog where id=1)<>before_questions+1 then raise exception 'duplicate_created_question'; end if;
 if (select count(*) from public.content_review_events)<>before_reviews+6 then raise exception 'review_receipt_count_wrong'; end if;
 if (select count(*) from public.neural_canonical_note_versions)<>before_notes+1 then raise exception 'note_count_wrong'; end if;
 again:=public.content_library_review_publish_v1(m->>'importId',reviewer,staged->>'digest','[]','Same replay',true);
 if again<>receipt or (select count(*) from public.content_review_events)<>before_reviews+6 then raise exception 'publish_replay_created_evidence'; end if;
 -- A canonical ID cannot be silently reassigned to a different exact duplicate.
 again:=m||jsonb_build_object('importId','verification:library-id-conflict','notes','[]'::jsonb,'noteQuestionLinks','[]'::jsonb,'questions',jsonb_build_array(q||jsonb_build_object('questionId',(select body->'questions'->0->>'questionId' from public.study_catalog where id=1))));
 staged:=public.content_library_stage_v1(again,null);
 begin perform public.content_library_review_publish_v1(again->>'importId',reviewer,staged->>'digest','[]','Synthetic ID conflict',true);raise exception 'id_conflict_accepted';
 exception when others then if sqlerrm not like '%question_identity_conflict%' then raise; end if; end;
 -- A later PYQ occurrence changes only metadata, never canonical identity/history.
 m:=m||jsonb_build_object('importId','verification:library-pyq','concepts',jsonb_build_array(jsonb_build_object('conceptId','verification:library-confusing-concept','label','Nonclinical confusing acceptance concept','aliases','[]'::jsonb,'subjectTags','["medicine"]'::jsonb,'classification',c)),'sources','[]'::jsonb,'notes','[]'::jsonb,'noteQuestionLinks','[]'::jsonb,'questions',jsonb_build_array(q||jsonb_build_object('questionId','verification:library-q-c','conceptLinks','[{"conceptId":"verification:library-concept","role":"primary"},{"conceptId":"verification:library-confusing-concept","role":"distractor"}]'::jsonb,'origins','[{"kind":"pyq","examId":"neet-pg","year":2024,"session":"main","evidence":"Synthetic test occurrence"},{"kind":"pyq","examId":"neet-pg","year":2025,"session":"main","evidence":"Synthetic repeated test occurrence"}]'::jsonb)));
 staged:=public.content_library_stage_v1(m,null);
 receipt:=public.content_library_review_publish_v1(m->>'importId',reviewer,staged->>'digest','[{"sourceId":"verification:library-source","rightsStatus":"owned","evidence":"Existing rights inspected again"}]','Synthetic occurrence review only',true);
 if (receipt->>'newQuestions')::integer<>0 or (receipt->>'existingQuestionsLinked')::integer<>1 then raise exception 'pyq_duplicated_question'; end if;
 if (select jsonb_array_length(origins) from public.content_library_question_metadata where question_id='verification:library-q-a')<>4 then raise exception 'occurrences_not_preserved'; end if;
 if not exists(select 1 from public.content_library_question_metadata meta cross join lateral jsonb_array_elements(meta.concept_links) l where meta.question_id='verification:library-q-a' and l->>'role'='distractor') then raise exception 'duplicate_concept_links_lost'; end if;
 m:=jsonb_set(m,'{importId}','"verification:library-answer-conflict"');m:=jsonb_set(m,'{questions,0,answerOptionId}','"b"');
 staged:=public.content_library_stage_v1(m,null);
 begin perform public.content_library_review_publish_v1(m->>'importId',reviewer,staged->>'digest','[]','Synthetic conflict',true);raise exception 'answer_conflict_accepted';
 exception when others then if sqlerrm not like '%answer_conflict%' then raise; end if; end;
 if has_function_privilege('authenticated','public.content_library_review_publish_v1(text,uuid,text,jsonb,text,boolean)','execute') or has_table_privilege('authenticated','public.content_library_imports','select') then raise exception 'browser_privilege_leak'; end if;
 if public.privacy_learner_scope_status()->>'complete'<>'true' then raise exception 'privacy_scope_drift'; end if;
end;
$verify$;
